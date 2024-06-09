// script.js

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
    let painting = false;
    let tool = 'pen';
    let penSize = 10;
    let eraserSize = 10;
    let maskCanvas = document.createElement('canvas');
    let maskCtx = maskCanvas.getContext('2d');

    if (backgroundCanvas) {
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
    let imgSrc = "{{ image_filename }}";
    if (imgSrc && ctx) {
        let img = new Image();
        img.onload = function() {
            backgroundCanvas.width = img.width;
            backgroundCanvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            ctx.drawImage(img, 0, 0, backgroundCanvas.width, backgroundCanvas.height);
        };
        img.src = '/static/' + imgSrc;
    }

    if (backgroundCanvas) {
        backgroundCanvas.addEventListener('mousedown', startPosition);
        backgroundCanvas.addEventListener('mouseup', endPosition);
        backgroundCanvas.addEventListener('mousemove', draw);
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
            document.getElementById('mask').value = maskCanvas.toDataURL();
            document.getElementById('uploaded_image').value = backgroundCanvas.toDataURL();
            document.getElementById('edit-form').submit();
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
        if (ctx) {
            ctx.beginPath();
            maskCtx.beginPath();
        }
    }

    function draw(event) {
        if (!painting) return;
        if (ctx) {
            ctx.lineWidth = tool === 'pen' ? penSize : eraserSize;
            ctx.lineCap = 'round';
            ctx.strokeStyle = tool === 'pen' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 1)';

            maskCtx.lineWidth = tool === 'pen' ? penSize : eraserSize;
            maskCtx.lineCap = 'round';
            maskCtx.strokeStyle = tool === 'pen' ? 'white' : 'black';

            let rect = backgroundCanvas.getBoundingClientRect();
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
