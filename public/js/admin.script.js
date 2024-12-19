// Add & Edit Brand Page Image Preview 
function previewImage(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function() {
      const imagePreview = document.getElementById('imagePreview');
      imagePreview.src = reader.result;  // Set the preview image's source to the file's result
      imagePreview.style.display = 'block';  // Show the image preview
    }

    if (file) {
      reader.readAsDataURL(file); // Read the file as a data URL
    }
  }
