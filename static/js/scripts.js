document.addEventListener('DOMContentLoaded', function() {
    function toggleMenu() {
        var menu = document.getElementById("dropdownMenu");
        if (menu) {
            if (menu.style.display === "block") {
                menu.style.display = "none";
            } else {
                menu.style.display = "block";
            }
        }
    }

    function updateCharacterCount(textareaId, countId) {
        var textarea = document.getElementById(textareaId);
        var countSpan = document.getElementById(countId);
        if (textarea && countSpan) {
            var remaining = 10000 - textarea.value.length;
            countSpan.textContent = "あと" + remaining + "文字";
        }
    }

    let backgroundCanvas = document.getElementById('backgroundCanvas');
    let drawingCanvas = document.getElementById('drawingCanvas');
    let ctx = backgroundCanvas ? backgroundCanvas.getContext('2d') : null;
    let drawingCtx = drawingCanvas ? drawingCanvas.getContext('2d') : null;
    let painting = false;
    let tool = 'pen';
    let penSize = 10;
    let eraserSize = 10;
    let maskCanvas = document.createElement('canvas');
    let maskCtx = maskCanvas.getContext('2d');

    if (backgroundCanvas && drawingCanvas) {
        maskCanvas.width = backgroundCanvas.width;
        maskCanvas.height = backgroundCanvas.height;
    }

    // Uploadボタンがファイル入力要素をクリックするように設定
    let uploadButton = document.getElementById('upload');
    let fileInput = document.getElementById('fileInput');
    if (uploadButton && fileInput) {
        uploadButton.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function(event) {
            let file = event.target.files[0];
            if (file) {
                let reader = new FileReader();
                reader.onload = function() {
                    let img = new Image();
                    img.onload = function() {
                        if (ctx) {
                            ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
                            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

                            // 画像のサイズに合わせてキャンバスのサイズを調整
                            backgroundCanvas.width = img.width;
                            backgroundCanvas.height = img.height;
                            maskCanvas.width = img.width;
                            maskCanvas.height = img.height;
                            ctx.drawImage(img, 0, 0, backgroundCanvas.width, backgroundCanvas.height);

                            // プレビュー表示
                            let imagePreview = document.getElementById('image-preview');
                            if (imagePreview) {
                                imagePreview.src = img.src;
                                imagePreview.style.display = 'block';
                            }
                        }
                    }
                    img.src = reader.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // canvas.htmlで画像を読み込む（edit.htmlから送信された画像を表示）
    let imgSrc = document.getElementById('image-preview').src;
    if (imgSrc && ctx) {
        let img = new Image();
        img.onload = function() {
            backgroundCanvas.width = img.width;
            backgroundCanvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            ctx.drawImage(img, 0, 0, backgroundCanvas.width, backgroundCanvas.height);
        };
        img.src = imgSrc;
    }

    if (drawingCanvas) {
        drawingCanvas.addEventListener('mousedown', startPosition);
        drawingCanvas.addEventListener('mouseup', endPosition);
        drawingCanvas.addEventListener('mousemove', draw);

        drawingCanvas.addEventListener('touchstart', startPosition);
        drawingCanvas.addEventListener('touchend', endPosition);
        drawingCanvas.addEventListener('touchmove', draw);
    }

    let penSizeInput = document.getElementById('pen-size');
    if (penSizeInput) {
        penSizeInput.addEventListener('input', function(event) {
            penSize = event.target.value;
        });
    }

    let eraserSizeInput = document.getElementById('eraser-size');
    if (eraserSizeInput) {
        eraserSizeInput.addEventListener('input', function(event) {
            eraserSize = event.target.value;
        });
    }

    let resetButton = document.getElementById('reset-button');
    if (resetButton && ctx) {
        resetButton.addEventListener('click', function() {
            ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            let img = new Image();
            img.src = document.getElementById('image-preview').src;
            img.onload = function() {
                ctx.drawImage(img, 0, 0, backgroundCanvas.width, backgroundCanvas.height);
            }
        });
    }

    let saveButton = document.getElementById('save-button');
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            let link = document.createElement('a');
            link.download = 'drawing.png';
            link.href = drawingCanvas.toDataURL();
            link.click();
        });
    }

    let penButton = document.getElementById('pen-button');
    if (penButton) {
        penButton.addEventListener('click', function() {
            tool = 'pen';
            penButton.classList.add('active');
            document.getElementById('eraser-button').classList.remove('active');
        });
    }

    let eraserButton = document.getElementById('eraser-button');
    if (eraserButton) {
        eraserButton.addEventListener('click', function() {
            tool = 'eraser';
            document.getElementById('pen-button').classList.remove('active');
            eraserButton.classList.add('active');
        });
    }

    function startPosition(event) {
        painting = true;
        draw(event);
    }

    function endPosition() {
        painting = false;
        if (drawingCtx) {
            drawingCtx.beginPath();
            maskCtx.beginPath();
        }
    }

    function draw(event) {
        if (!painting) return;
        event.preventDefault();
        if (drawingCtx) {
            let rect = drawingCanvas.getBoundingClientRect();
            let x, y;
            if (event.touches) {
                x = event.touches[0].clientX - rect.left;
                y = event.touches[0].clientY - rect.top;
            } else {
                x = event.clientX - rect.left;
                y = event.clientY - rect.top;
            }

            drawingCtx.lineWidth = tool === 'pen' ? penSize : eraserSize;
            drawingCtx.lineCap = 'round';
            drawingCtx.strokeStyle = tool === 'pen' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 1)';

            maskCtx.lineWidth = tool === 'pen' ? penSize : eraserSize;
            maskCtx.lineCap = 'round';
            maskCtx.strokeStyle = tool === 'pen' ? 'white' : 'black';

            drawingCtx.lineTo(x, y);
            drawingCtx.stroke();
            drawingCtx.beginPath();
            drawingCtx.moveTo(x, y);

            maskCtx.lineTo(x, y);
            maskCtx.stroke();
            maskCtx.beginPath();
            maskCtx.moveTo(x, y);
        }
    }

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
            let creditInfo = document.getElementById('credit-info');
            if (creditInfo) {
                creditInfo.innerText = `残りクレジット: ${data.credits}`;
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // 画像生成後にクレジットを更新
    let generateForm = document.getElementById('generate-form');
    if (generateForm) {
        generateForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // 画像生成処理...
            updateCredits(apiKey);
        });
    }
});
