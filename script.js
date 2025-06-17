import { storage, db } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import firebase from 'firebase/app';

// URL của Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzy2wkwByCVEVuC227oMPjyqjSOA1j1gksxTiMgi5nwDuZE1wLrEJKeyg9V3KJFUc_wZw/exec';

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
    try {
        // Chuyển file thành base64
        const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(file);
        });

        const data = {
            action: 'uploadImage',
            fileName: file.name,
            fileData: base64Data
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('Response text:', text);
            throw new Error('Invalid server response');
        }

        if (result.status === 'error') {
            throw new Error(result.message || 'Upload failed');
        }

        return result.imageUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error('Upload failed: ' + error.message);
    }
}

// Hàm gửi dữ liệu lên Google Sheet
async function submitToGoogleSheet(data) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'submitData',
                ...data
            })
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('Response text:', text);
            throw new Error('Invalid server response');
        }

        if (result.status === 'error') {
            throw new Error(result.message || 'Submit failed');
        }

        return result;
    } catch (error) {
        console.error('Submit error:', error);
        throw new Error('Submit failed: ' + error.message);
    }
}

async function uploadImage(file) {
    try {
        // Tạo tên file duy nhất
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        
        // Upload to Firebase Storage
        const storageRef = storage.ref(`athlete-images/${fileName}`);
        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Hàm chuyển đổi file thành base64
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve({
                filename: file.name,
                mimeType: file.type,
                bytes: base64String
            });
        };
        reader.onerror = error => reject(error);
    });
}

// Hàm submit form
async function submitForm(formData) {
    try {
        // Chuyển đổi file thành base64
        const [idCardImage, portraitImage] = await Promise.all([
            fileToBase64(formData.idCardImage),
            fileToBase64(formData.portraitImage)
        ]);

        // Gửi dữ liệu lên server
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: formData.type,
                athleteName: formData.athleteName,
                birthYear: formData.birthYear,
                registrationClass: formData.registrationClass,
                referenceClass: formData.referenceClass,
                teamOrigin: formData.teamOrigin,
                idCardImage,
                portraitImage
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }
        return result;
    } catch (error) {
        console.error('Error submitting form:', error);
        throw error;
    }
} 
