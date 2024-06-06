from flask import Flask, request, render_template, send_file, session, redirect, url_for
import os
import requests
import time

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv('SECRET_KEY', 'supersecretkey')

def generate_image(prompt, negative_prompt, aspect_ratio, style_preset, api_key, model, seed=None, output_format="png"):
    if model == "ultra":
        url = "https://api.stability.ai/v2beta/stable-image/generate/ultra"
    else:
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
            image_filename = os.path.basename(image_path)
            return redirect(url_for('generated', image_filename=image_filename))
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
        creativity = request.form.get('creativity')
        creativity = float(creativity) if creativity else 0.3

        try:
            image_path = upscale_image(image, prompt, negative_prompt, upscale_type, api_key, seed, output_format, creativity)
            image_filename = os.path.basename(image_path)
            return redirect(url_for('upscaled', image_filename=image_filename))
        except Exception as e:
            return str(e)
    return render_template('upscale.html')

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

if __name__ == '__main__':
    app.run()
