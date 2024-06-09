from flask import Flask, request, render_template, send_file, session, redirect, url_for, jsonify, flash, make_response
import os
import requests
import time
import base64
from werkzeug.utils import secure_filename
from PIL import Image
import io

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv('SECRET_KEY', 'supersecretkey')
app.config['UPLOAD_FOLDER'] = 'static/images/'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# Ensure the upload folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def get_credits(api_key):
    api_host = os.getenv('API_HOST', 'https://api.stability.ai')
    url = f"{api_host}/v1/user/balance"
    response = requests.get(url, headers={
        "Authorization": f"Bearer {api_key}"
    })

    if response.status_code == 200:
        return response.json().get('credits', None)
    else:
        return None

def get_account_info(api_key):
    api_host = os.getenv('API_HOST', 'https://api.stability.ai')
    url = f"{api_host}/v1/user/account"
    response = requests.get(url, headers={
        "Authorization": f"Bearer {api_key}"
    })

    if response.status_code == 200:
        return response.json()
    else:
        return None

def generate_image(prompt, negative_prompt, aspect_ratio, style_preset, api_key, model, seed=None, output_format="png"):
    if model == "ultra":
        url = "https://api.stability.ai/v2beta/stable-image/generate/ultra"
    elif model == "sd3":
        url = "https://api.stability.ai/v2beta/stable-image/generate/sd3"
    elif model == "sd3-turbo":
        url = "https://api.stability.ai/v2beta/stable-image/generate/sd3-turbo"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "accept": "image/*"
    }
    files = {
        "prompt": (None, prompt),
        "negative_prompt": (None, negative_prompt),
        "aspect_ratio": (None, aspect_ratio),
        "style_preset": (None, style_preset),
        "output_format": (None, output_format),
        "model": (None, model)
    }
    if seed is not None:
        files["seed"] = (None, str(seed))

    try:
        response = requests.post(url, headers=headers, files=files)
        response.raise_for_status()
        file_name = get_unique_filename(output_format)
        file_path = f"static/{file_name}.{output_format}"
        with open(file_path, 'wb') as file:
            file.write(response.content)
        return file_path
    except requests.exceptions.HTTPError as http_err:
        try:
            error_message = response.json()
        except ValueError:
            error_message = response.text
        print(f"HTTP error occurred: {http_err}, Response: {error_message}")
        raise Exception(f"Error: {response.status_code}, Response: {error_message}")
    except Exception as err:
        print(f"An error occurred: {err}")
        raise Exception(f"An unexpected error occurred: {err}")

def upscale_image(image, prompt, negative_prompt, upscale_type, api_key, seed=None, output_format="png", creativity=0.3):
    if upscale_type == "conservative":
        url = "https://api.stability.ai/v2beta/stable-image/upscale/conservative"
        if creativity < 0.2 or creativity > 0.5:
            raise ValueError("Creativity for conservative upscale must be between 0.2 and 0.5")
    elif upscale_type == "creative":
        url = "https://api.stability.ai/v2beta/stable-image/upscale/creative"
        if creativity < 0.2 or creativity > 0.35:
            raise ValueError("Creativity for creative upscale must be between 0.2 and 0.35")
    else:
        raise ValueError("Invalid upscale type")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "accept": "image/*"
    }
    files = {
        "image": image,
        "prompt": (None, prompt),
        "output_format": (None, output_format),
        "creativity": (None, str(creativity))
    }
    if negative_prompt:
        files["negative_prompt"] = (None, negative_prompt)
    if seed is not None:
        files["seed"] = (None, str(seed))

    try:
        response = requests.post(url, headers=headers, files=files)
        response.raise_for_status()
        file_name = get_unique_filename(output_format)
        file_path = f"static/{file_name}.{output_format}"
        with open(file_path, 'wb') as file:
            file.write(response.content)
        if upscale_type == "conservative":
            return file_path
        else:
            upscale_id = response.json()["id"]
            return fetch_creative_upscale_result(upscale_id, api_key, output_format)
    except requests.exceptions.HTTPError as http_err:
        try:
            error_message = response.json()
        except ValueError:
            error_message = response.text
        print(f"HTTP error occurred: {http_err}, Response: {error_message}")
        raise Exception(f"Error: {response.status_code}, Response: {error_message}")
    except Exception as err:
        print(f"An error occurred: {err}")
        raise Exception(f"An unexpected error occurred: {err}")

def fetch_creative_upscale_result(upscale_id, api_key, output_format="png"):
    url = f"https://api.stability.ai/v2beta/stable-image/upscale/creative/result/{upscale_id}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "accept": "image/*"
    }

    for _ in range(10):
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 202:
                print("Generation in-progress, trying again in 10 seconds.")
                time.sleep(10)
            else:
                response.raise_for_status()
                file_name = get_unique_filename(output_format)
                file_path = f"static/{file_name}.{output_format}"
                with open(file_path, 'wb') as file:
                    file.write(response.content)
                return file_path
        except requests.exceptions.HTTPError as http_err:
            try:
                error_message = response.json()
            except ValueError:
                error_message = response.text
            print(f"HTTP error occurred: {http_err}, Response: {error_message}")
            raise Exception(f"Error: {response.status_code}, Response: {error_message}")
        except Exception as err:
            print(f"An error occurred: {err}")
            raise Exception(f"An unexpected error occurred: {err}")

def get_unique_filename(extension):
    i = 1
    while True:
        file_name = f"{i:03d}"
        if not os.path.exists(f"static/{file_name}.{extension}"):
            return file_name
        i += 1

def call_api(endpoint, files, data, api_key):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "accept": "image/*"
    }
    response = requests.post(
        f"https://api.stability.ai/v2beta/stable-image/edit/{endpoint}",
        headers=headers,
        files=files,
        data=data,
        stream=True,  # ストリーミングを有効にする
        timeout=300  # タイムアウトを設定する
    )
    if response.status_code == 200:
        response.raw.decode_content = True
        return response.raw.read(), response.headers['Content-Type']
    else:
        raise Exception(response.json())

@app.route('/', methods=['GET', 'POST'])
def index():
    credits = None
    account_info = None
    if request.method == 'POST':
        session['api_key'] = request.form['api_key']
        api_key = session['api_key']
        credits = get_credits(api_key)
        account_info = get_account_info(api_key)
        session['credits'] = credits
        return render_template('index.html', credits=credits, account_info=account_info)
    return render_template('index.html', credits=session.get('credits'), account_info=account_info)

@app.route('/generate', methods=['GET', 'POST'])
def generate():
    api_key = session.get('api_key')
    if not api_key:
        return redirect(url_for('index'))

    if request.method == 'POST':
        prompt = request.form['prompt']
        negative_prompt = request.form['negative_prompt']
        aspect_ratio = request.form['aspect_ratio']
        style_preset = request.form['style_preset']
        model = request.form['model']
        seed = request.form.get('seed')
        seed = int(seed) if seed else None

        try:
            image_path = generate_image(prompt, negative_prompt, aspect_ratio, style_preset, api_key, model, seed)
            image_filename = os.path.basename(image_path)
            session['credits'] = get_credits(api_key)
            return redirect(url_for('generated', image_filename=image_filename))
        except Exception as e:
            return str(e)
    return render_template('generate.html', credits=session.get('credits'))

@app.route('/upscale', methods=['GET', 'POST'])
def upscale():
    api_key = session.get('api_key')
    if not api_key:
        return redirect(url_for('index'))

    if request.method == 'POST':
        image = request.files['image']
        prompt = request.form['prompt']
        negative_prompt = request.form['negative_prompt']
        upscale_type = request.form['upscale_type']
        output_format = request.form['output_format']
        seed = request.form.get('seed')
        seed = int(seed) if seed else None
        creativity = request.form.get('creativity')
        creativity = float(creativity) if creativity else 0.3

        try:
            image_path = upscale_image(image, prompt, negative_prompt, upscale_type, api_key, seed, output_format, creativity)
            image_filename = os.path.basename(image_path)
            session['credits'] = get_credits(api_key)
            return redirect(url_for('upscaled', image_filename=image_filename))
        except Exception as e:
            return str(e)
    return render_template('upscale.html', credits=session.get('credits'))

@app.route('/oekaki')
def oekaki_index():
    return render_template('oekaki_index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file part')
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        app.logger.info(f'File uploaded: {filename}')
        return jsonify({'filename': filename})
    flash('File not allowed')
    return redirect(request.url)

@app.route('/save', methods=['POST'])
def save_image():
    data = request.json
    merged_image_data = data['merged_image']
    drawing_image_data = data['drawing_image']

    merged_image = Image.open(io.BytesIO(base64.b64decode(merged_image_data.split(',')[1])))
    drawing_image = Image.open(io.BytesIO(base64.b64decode(drawing_image_data.split(',')[1])))

    merged_image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'merged_image.png')
    drawing_image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'drawing_image.png')

    merged_image.save(merged_image_path, format='PNG', quality=100)  # Save with maximum quality
    drawing_image.save(drawing_image_path, format='PNG', quality=100)

    return jsonify(status='success')

@app.route('/result')
def result():
    return render_template('result.html')

@app.route('/get_credits', methods=['POST'])
def fetch_credits():
    api_key = session.get('api_key')
    if not api_key:
        return jsonify({"error": "API key is missing"}), 400

    credits = get_credits(api_key)
    if credits is not None:
        session['credits'] = credits
        return jsonify({"credits": credits}), 200
    else:
        return jsonify({"error": "Failed to fetch credits"}), 500

@app.route('/generated')
def generated():
    image_filename = request.args.get('image_filename')
    return render_template('generated.html', image_filename=image_filename)

@app.route('/upscaled')
def upscaled():
    image_filename = request.args.get('image_filename')
    return render_template('upscaled.html', image_filename=image_filename)

@app.route('/download_image/<filename>')
def download_image(filename):
    return send_file(f'static/{filename}', as_attachment=True)

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        # お問い合わせ処理
        pass
    return render_template('contact.html')

@app.route('/privacy_policy')
def privacy_policy():
    return render_template('privacy_policy.html')

@app.route('/terms_of_service')
def terms_of_service():
    return render_template('terms_of_service.html')

@app.route('/erase', methods=['POST'])
def erase():
    api_key = session.get('api_key')
    if not api_key:
        return redirect(url_for('index'))
    image = request.files.get('image')
    mask = request.files.get('mask')
    output_format = 'png'
    files = {'image': image, 'mask': mask}
    data = {'output_format': output_format}
    result, content_type = call_api('erase', files, data, api_key)
    response = make_response(result)
    response.headers.set('Content-Type', content_type)
    return response

@app.route('/inpaint', methods=['POST'])
def inpaint():
    api_key = session.get('api_key')
    if not api_key:
        return redirect(url_for('index'))
    image = request.files.get('image')
    mask = request.files.get('mask')
    prompt = request.form.get('prompt')
    negative_prompt = request.form.get('negative_prompt')
    seed = request.form.get('seed')
    output_format = request.form.get('output_format', 'png')
    files = {'image': image, 'mask': mask}
    data = {
        'prompt': prompt,
        'negative_prompt': negative_prompt,
        'seed': seed,
        'output_format': output_format
    }
    result, content_type = call_api('inpaint', files, data, api_key)
    response = make_response(result)
    response.headers.set('Content-Type', content_type)
    return response


@app.route('/outpaint', methods=['POST'])
def outpaint():
    api_key = session.get('api_key')
    if not api_key:
        return redirect(url_for('index'))
    image = request.files.get('image')
    left = request.form.get('left')
    right = request.form.get('right')
    up = request.form.get('up')
    down = request.form.get('down')
    output_format = 'png'
    files = {'image': image}
    data = {'left': left, 'right': right, 'up': up, 'down': down, 'output_format': output_format}
    result, content_type = call_api('outpaint', files, data, api_key)
    response = make_response(result)
    response.headers.set('Content-Type', content_type)
    return response

    
@app.route('/edit', methods=['GET', 'POST'])
def edit():
    api_key = session.get('api_key')
    if not api_key:
        return redirect(url_for('index'))

    if request.method == 'POST':
        # ここで編集操作を実行します
        image = request.files['image']
        mask = request.files.get('mask')
        prompt = request.form.get('prompt')
        negative_prompt = request.form.get('negative_prompt')
        edit_type = request.form['edit_type']
        output_format = request.form['output_format']
        seed = request.form.get('seed')
        seed = int(seed) if seed else None

        try:
            if edit_type == 'erase':
                image_path = erase_image(image, mask, api_key, seed, output_format)
            elif edit_type == 'inpaint':
                image_path = inpaint_image(image, prompt, mask, api_key, negative_prompt, seed, output_format)
            elif edit_type == 'outpaint':
                directions = {
                    "left": request.form.get('left'),
                    "right": request.form.get('right'),
                    "up": request.form.get('up'),
                    "down": request.form.get('down')
                }
                directions = {k: int(v) for k, v in directions.items() if v}
                creativity = request.form.get('creativity')
                creativity = float(creativity) if creativity else None
                image_path = outpaint_image(image, directions, api_key, prompt, seed, output_format, creativity)
            else:
                raise ValueError("Invalid edit type")

            image_filename = os.path.basename(image_path)
            session['credits'] = get_credits(api_key)
            return redirect(url_for('result', image_filename=image_filename))
        except Exception as e:
            return str(e)
    return render_template('edit.html', credits=session.get('credits'))
 
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
