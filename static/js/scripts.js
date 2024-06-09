// script.js

document.addEventListener('DOMContentLoaded', function() {
    function toggleMenu() {
        var menu = document.getElementById("dropdownMenu");
        if (menu.style.display === "block") {
            menu.style.display = "none";
        } else {
            menu.style.display = "block";
        }
    }

    function updateCharacterCount(textareaId, countId) {
        var textarea = document.getElementById(textareaId);
        var countSpan = document.getElementById(countId);
        var remaining = 10000 - textarea.value.length;
        countSpan.textContent = "あと" + remaining + "文字";
    }

    let canvas = document.getElementById('canvas');
    let ctx = canvas ? canvas.getContext('2d') : null;
    let painting = false;
    let tool = 'pen';
    let penSize = 10;
    let eraserSize = 10;
    let maskCanvas = document.createElement('canvas');
    let maskCtx = maskCanvas.getContext('2d');

    if (canvas) {
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
    }

    // 画像プレビュー機能追加（edit.html用）
    document.getElementById('image').addEventListener('change', function(event) {
        let reader = new FileReader();
        reader.onload = function() {
            let img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

                // 画像のサイズに合わせてキャンバスのサイズを調整
                canvas.width = img.width;
                canvas.height = img.height;
                maskCanvas.width = img.width;
                maskCanvas.height = img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // プレビュー表示
                document.getElementById('image-preview').src = img.src;
                document.getElementById('image-preview').style.display = 'block';
            }
            img.src = reader.result;
        }
        reader.readAsDataURL(event.target.files[0]);
    });

    // canvas.htmlで画像を読み込む（edit.htmlから送信された画像を表示）
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
});
