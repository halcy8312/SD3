from flask import Flask, request, render_template, send_file, session, redirect, url_for
import os
import requests

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv('SECRET_KEY', 'supersecretkey')  # 環境変数からシークレットキーを取得

def generate_image(prompt, negative_prompt, aspect_ratio, style_preset, api_key, model, seed=None, output_format="png"):
    url = f"https://api.stability.ai/v2beta/stable-image/generate/{model}"
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
    }
    if seed is not None:
        files["seed"] = (None, str(seed))

    try:
        response = requests.post(url, headers=headers, files=files)
        response.raise_for_status()
        file_name = get_unique_filename(output_format)
        file_path = f"{file_name}.{output_format}"
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

def upscale_image(image, prompt, negative_prompt, upscale_type, api_key, seed=None, output_format="png"):
    if upscale_type == "conservative":
        url = "https://api.stability.ai/v2beta/upscale/conservative"
    elif upscale_type == "creative":
        url = "https://api.stability.ai/v2beta/upscale/creative/start"
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
    }
    if negative_prompt:
        files["negative_prompt"] = (None, negative_prompt)
    if seed is not None:
        files["seed"] = (None, str(seed))

    try:
        response = requests.post(url, headers=headers, files=files)
        response.raise_for_status()
        file_name = get_unique_filename(output_format)
        file_path = f"{file_name}.{output_format}"
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
        if not os.path.exists(f"{file_name}.{extension}"):
            return file_name
        i += 1

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        session['api_key'] = request.form['api_key']
        return redirect(url_for('generate'))
    return render_template('index.html')

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
            return send_file(image_path, mimetype='image/png')
        except Exception as e:
            return str(e)
    return render_template('generate.html')

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

        try:
            image_path = upscale_image(image, prompt, negative_prompt, upscale_type, api_key, seed, output_format)
            return send_file(image_path, mimetype=f'image/{output_format}')
        except Exception as e:
            return str(e)
    return render_template('upscale.html')

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

if __name__ == '__main__':
    app.run()