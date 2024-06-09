document.addEventListener('DOMContentLoaded', function() {
    // キャンバスの設定
    let canvas = document.getElementById('drawingCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    let ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Canvas context not found');
        return;
    }
    let painting = false;
    let tool = 'pen';
    let penSize = 10;
    let eraserSize = 10;
    let maskCanvas = document.createElement('canvas');
    let maskCtx = maskCanvas.getContext('2d');

    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;

    // ページロード時に画像を読み込む（必要に応じて画像ファイル名を取得）
    let imgSrc = "{{ image_filename }}";
    if (imgSrc) {
        let img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = '/static/' + imgSrc;
    }

    // 画像ファイル選択時のイベント
    document.getElementById('fileInput').addEventListener('change', function(event) {
        let reader = new FileReader();
        reader.onload = function() {
            let img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

                canvas.width = img.width;
                canvas.height = img.height;
                maskCanvas.width = img.width;
                maskCanvas.height = img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                document.getElementById('image-preview').src = img.src;
                document.getElementById('image-preview').style.display = 'block';
            }
            img.src = reader.result;
        }
        reader.readAsDataURL(event.target.files[0]);
    });

    // 描画イベントのリスナー
    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', endPosition);
    canvas.addEventListener('mousemove', draw);

    document.getElementById('pen-size').addEventListener('input', function(event) {
        penSize = event.target.value;
    });

    document.getElementById('eraser-size').addEventListener('input', function(event) {
        eraserSize = event.target.value;
    });

    document.getElementById('reset-button').addEventListener('click', function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        let img = new Image();
        img.src = document.getElementById('image-preview').src;
        img.onload = function() {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    });

    document.getElementById('save-button').addEventListener('click', function() {
        document.getElementById('mask').value = maskCanvas.toDataURL();
        document.getElementById('uploaded_image').value = canvas.toDataURL();
        document.getElementById('edit-form').submit();
    });

    document.getElementById('pen-button').addEventListener('click', function() {
        tool = 'pen';
        document.getElementById('pen-button').classList.add('active');
        document.getElementById('eraser-button').classList.remove('active');
    });

    document.getElementById('eraser-button').addEventListener('click', function() {
        tool = 'eraser';
        document.getElementById('pen-button').classList.remove('active');
        document.getElementById('eraser-button').classList.add('active');
    });

    function startPosition(event) {
        painting = true;
        draw(event);
    }

    function endPosition() {
        painting = false;
        ctx.beginPath();
        maskCtx.beginPath();
    }

    function draw(event) {
        if (!painting) return;
        ctx.lineWidth = tool === 'pen' ? penSize : eraserSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = tool === 'pen' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 1)';

        maskCtx.lineWidth = tool === 'pen' ? penSize : eraserSize;
        maskCtx.lineCap = 'round';
        maskCtx.strokeStyle = tool === 'pen' ? 'white' : 'black';

        let rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);

        maskCtx.lineTo(x, y);
        maskCtx.stroke();
        maskCtx.beginPath();
        maskCtx.moveTo(x, y);
    }

    // クレジット更新機能
    function updateCredits(apiKey) {
        fetch('/get_credits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('credit-info').innerText = `残りクレジット: ${data.credits}`;
        })
        .catch(error => console.error('Error:', error));
    }

    // 画像生成後にクレジットを更新
    document.getElementById('generate-form').addEventListener('submit', function(event) {
        event.preventDefault();
        // 画像生成処理...
        updateCredits(apiKey);
    });

    // ドラッグ＆ドロップ、ツールの選択、色の選択、サイズの選択
    const backgroundCanvas = document.getElementById('backgroundCanvas');
    const backgroundCtx = backgroundCanvas.getContext('2d');
    const drawingCanvas = document.getElementById('drawingCanvas');
    const drawingCtx = drawingCanvas.getContext('2d');
    const uploadButton = document.getElementById('upload');
    const saveButton = document.getElementById('save');
    const fileInput = document.getElementById('fileInput');
    const toolSelect = document.getElementById('tool');
    const colorPicker = document.getElementById('colorPicker');
    const sizePicker = document.getElementById('sizePicker');

    let drawing = false;
    let color = '#000000';
    let size = 5;
    let image = null;
    let originalWidth, originalHeight;

    function startDrawing(event) {
        drawing = true;
        draw(event);
    }

    function stopDrawing() {
        drawing = false;
        drawingCtx.beginPath();
    }

    function draw(event) {
        if (!drawing) return;

        event.preventDefault();
        drawingCtx.lineWidth = size;
        drawingCtx.lineCap = 'round';

        const rect = drawingCanvas.getBoundingClientRect();
        let x, y;

        if (event.touches) {
            x = (event.touches[0].clientX - rect.left) * (drawingCanvas.width / rect.width);
            y = (event.touches[0].clientY - rect.top) * (drawingCanvas.height / rect.height);
        } else {
            x = (event.clientX - rect.left) * (drawingCanvas.width / rect.width);
            y = (event.clientY - rect.top) * (drawingCanvas.height / rect.height);
        }

        if (tool === 'pen') {
            drawingCtx.globalCompositeOperation = 'source-over';
            drawingCtx.strokeStyle = color;
        } else if (tool === 'eraser') {
            drawingCtx.globalCompositeOperation = 'destination-out';
            drawingCtx.strokeStyle = 'rgba(0,0,0,1)';
        }

        drawingCtx.lineTo(x, y);
        drawingCtx.stroke();
        drawingCtx.beginPath();
        drawingCtx.moveTo(x, y);
    }

    function resizeCanvas() {
        const maxCanvasWidth = window.innerWidth - 20;
        const maxCanvasHeight = window.innerHeight - 20;
        const aspectRatio = originalWidth / originalHeight;

        let canvasWidth, canvasHeight;
        if (aspectRatio > 1) {
            canvasWidth = maxCanvasWidth;
            canvasHeight = maxCanvasWidth / aspectRatio;
        } else {
            canvasHeight = maxCanvasHeight;
            canvasWidth = maxCanvasHeight * aspectRatio;
        }

        backgroundCanvas.style.width = canvasWidth + 'px';
        backgroundCanvas.style.height = canvasHeight + 'px';
        drawingCanvas.style.width = canvasWidth + 'px';
        drawingCanvas.style.height = canvasHeight + 'px';

        backgroundCanvas.width = originalWidth;
        backgroundCanvas.height = originalHeight;
        drawingCanvas.width = originalWidth;
        drawingCanvas.height = originalHeight;

        if (image) {
            backgroundCtx.drawImage(image, 0, 0, originalWidth, originalHeight);
        }
    }

    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (!file) {
            console.error('No file selected');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.filename) {
                console.log('File uploaded:', data.filename);
                const img = new Image();
                img.src = `/static/images/${data.filename}`;
                img.onload = function() {
                    image = img;
                    originalWidth = img.width;
                    originalHeight = img.height;
                    resizeCanvas();
                };
            } else {
                console.error('File upload failed:', data.error);
            }
        })
        .catch(error => {
            console.error('An error occurred while uploading the image:', error);
        });
    });

    saveButton.addEventListener('click', function() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        tempCtx.drawImage(backgroundCanvas, 0, 0);
        tempCtx.drawImage(drawingCanvas, 0, 0);
        const mergedDataUrl = tempCanvas.toDataURL('image/png', 1.0);
        const drawingDataUrl = drawingCanvas.toDataURL('image/png', 1.0);

        fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                merged_image: mergedDataUrl,
                drawing_image: drawingDataUrl
            })
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/result';
            } else {
                console.error('Failed to save images');
            }
        })
        .catch(error => {
            console.error('An error occurred while saving the images:', error);
        });
    });

    window.addEventListener('resize', resizeCanvas);

    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('touchstart', startDrawing);
    drawingCanvas.addEventListener('touchend', stopDrawing);
    drawingCanvas.addEventListener('touchmove', draw);

    toolSelect.addEventListener('change', function() {
        tool = this.value;
    });

    colorPicker.addEventListener('input', function() {
        color = this.value;
    });

    sizePicker.addEventListener('input', function() {
        size = this.value;
    });
});
