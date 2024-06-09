document.addEventListener('DOMContentLoaded', function() {
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
    let tool = 'pen';
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
        const mergedDataUrl = tempCanvas.toDataURL('image/png', 1.0);  // Use 1.0 for best quality
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
