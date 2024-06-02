from flask import Flask, request, render_template, send_file, session, redirect, url_for
import os
import requests
import random

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # セッションの暗号化に使用するキー。安全のために本番環境では環境変数に設定します。

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
        "style_preset": (None, style_ppreset),
        "output_format": (None, output_format),
    }
    if seed is not None:
        files["seed"] = (None, str(seed))

    response = requests.post(url, headers=headers, files=files)
    
    if response.status_code == 200:
        file_name = get_unique_filename(output_format)
        file_path = f"{file_name}.{output_format}"
        with open(file_path, 'wb') as file:
            file.write(response.content)
        return file_path
    else:
        try:
            error_message = response.json()
        except ValueError:
            error_message = response.text
        raise Exception(f"Error: {response.status_code}, Response: {error_message}")

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

if __name__ == '__main__':
    app.run(debug=True)
