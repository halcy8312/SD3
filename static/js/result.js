document.addEventListener('DOMContentLoaded', function() {
    const downloadMergedButton = document.getElementById('downloadMerged');
    const downloadDrawingButton = document.getElementById('downloadDrawing');
    const backButton = document.getElementById('back');

    downloadMergedButton.addEventListener('click', function() {
        const mergedImage = document.getElementById('mergedImage').src;
        const link = document.createElement('a');
        link.href = mergedImage;
        link.download = 'merged_image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    downloadDrawingButton.addEventListener('click', function() {
        const drawingImage = document.getElementById('drawingImage').src;
        const link = document.createElement('a');
        link.href = drawingImage;
        link.download = 'drawing_image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    backButton.addEventListener('click', function() {
        window.location.href = '/';
    });
});
