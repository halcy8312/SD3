function toggleMenu() {
    var menu = document.getElementById("dropdownMenu");
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}
// script.js
function updateCharacterCount(textareaId, countId) {
    var textarea = document.getElementById(textareaId);
    var countSpan = document.getElementById(countId);
    var remaining = 10000 - textarea.value.length;
    countSpan.textContent = "あと" + remaining + "文字";
}
