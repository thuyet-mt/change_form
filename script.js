// Function to preview image before upload
function previewImage(event) {
    const preview = document.getElementById('imagePreview');
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

// Function to submit form
async function submitForm(event) {
    event.preventDefault();
    
    // Get form data
    const form = document.getElementById('athleteForm');
    const formData = new FormData(form);
    
    // Get image file
    const imageFile = document.getElementById('athleteImage').files[0];
    if (!imageFile) {
        alert('Vui lòng chọn ảnh VĐV');
        return false;
    }

    try {
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = 'Đang gửi...';

        // Upload image first
        const imageUrl = await uploadImage(imageFile);
        
        // Prepare form data
        const submissionData = {
            formType: formData.get('formType'),
            oldAthleteName: formData.get('oldAthleteName'),
            newAthleteName: formData.get('newAthleteName'),
            birthYear: formData.get('birthYear'),
            registrationRank: formData.get('registrationRank'),
            referenceRank: formData.get('referenceRank'),
            team: formData.get('team'),
            imageUrl: imageUrl
        };

        // Save form data
        const result = await google.script.run
            .withSuccessHandler(response => response)
            .withFailureHandler(error => {
                throw new Error(error);
            })
            .saveFormData(submissionData);

        if (result.success) {
            alert('Gửi đăng ký thành công!');
            form.reset();
            document.getElementById('imagePreview').style.display = 'none';
        } else {
            throw new Error(result.error || 'Có lỗi xảy ra khi gửi đăng ký');
        }
    } catch (error) {
        alert('Có lỗi xảy ra: ' + error.message);
    } finally {
        // Reset button state
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Gửi đăng ký';
    }

    return false;
}

// Function to upload image
function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const obj = {
                filename: file.name,
                mimeType: file.type,
                bytes: [...new Int8Array(e.target.result)]
            };
            
            google.script.run
                .withSuccessHandler(url => resolve(url))
                .withFailureHandler(error => reject(error))
                .uploadImage(obj);
        };
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
    });
} 
