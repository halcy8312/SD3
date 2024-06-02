from flask import Flask, request, render_template, send_file, session, redirect, url_for, flash
import os
import requests
import random

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
        session['prompt'] = request.form['prompt']
        session['negative_prompt'] = request.form['negative_prompt']
        session['aspect_ratio'] = request.form['aspect_ratio']
        session['style_preset'] = request.form['style_preset']
        session['model'] = request.form['model']
        session['seed'] = request.form['seed']
        return redirect(url_for('generate'))
    return render_template('index.html')

@app.route('/generate', methods=['GET', 'POST'])
def generate():
    api_key = session.get('api_key')
    if not api_key:
        return redirect(url_for('index'))

    if request.method == 'POST':
        prompt = session.get('prompt')
        negative_prompt = session.get('negative_prompt')
        aspect_ratio = session.get('aspect_ratio')
        style_preset = session.get('style_preset')
        model = session.get('model')
        seed = session.get('seed')
        seed = int(seed) if seed else None

        try:
            image_path = generate_image(prompt, negative_prompt, aspect_ratio, style_preset, api_key, model, seed)
            return render_template('result.html', image_path=image_path)
        except Exception as e:
            flash(str(e))
            return redirect(url_for('index'))

    return render_template('generate.html')

@app.route('/back', methods=['POST'])
def back():
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run()
