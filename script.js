document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('athleteForm');
    const oldAthleteSection = document.getElementById('oldAthleteSection');
    const imageInput = document.getElementById('athleteImage');
    const imagePreview = document.getElementById('imagePreview');
    const formTypeInputs = document.querySelectorAll('input[name="formType"]');

    // Xử lý hiển thị/ẩn phần VĐV cũ dựa vào hình thức
    formTypeInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'thaythe' || this.value === 'chuyennhuong') {
                oldAthleteSection.style.display = 'block';
            } else {
                oldAthleteSection.style.display = 'none';
            }
        });
    });

    // Xử lý preview ảnh
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                imagePreview.innerHTML = '';
                imagePreview.appendChild(img);
                img.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Xử lý submit form
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(form);
        const imageFile = formData.get('athleteImage');

        try {
            // Upload ảnh lên Google Drive và lấy link
            const imageUrl = await uploadImageToDrive(imageFile);
            
            // Chuẩn bị dữ liệu để gửi lên Google Sheet
            const data = {
                formType: formData.get('formType'),
                oldAthleteName: formData.get('oldAthleteName'),
                newAthleteName: formData.get('newAthleteName'),
                birthYear: formData.get('birthYear'),
                registrationClass: formData.get('registrationClass'),
                referenceClass: formData.get('referenceClass'),
                fromTeam: formData.get('fromTeam'),
                imageUrl: imageUrl
            };

            // Gửi dữ liệu lên Google Sheet
            await submitToGoogleSheet(data);

            alert('Gửi thông tin thành công!');
            form.reset();
            imagePreview.innerHTML = '';
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại!');
        }
    });
});

// Hàm upload ảnh lên Google Drive
async function uploadImageToDrive(file) {
    // Thay thế URL này bằng URL của Google Apps Script của bạn
    const scriptUrl = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(scriptUrl + '?action=uploadImage', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.imageUrl;
}

// Hàm gửi dữ liệu lên Google Sheet
async function submitToGoogleSheet(data) {
    // Thay thế URL này bằng URL của Google Apps Script của bạn
    const scriptUrl = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
    
    const response = await fetch(scriptUrl + '?action=submitData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error('Submit failed');
    }

    return await response.json();
} 
