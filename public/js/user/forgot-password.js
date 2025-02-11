const toastSuccess = (message) => {
    iziToast.success({
      message: message,
      backgroundColor: '#0e932d',
      messageColor: '#FFFFFF',
      icon: 'fa fa-check',
      iconColor: '#FFFFFF',
      timeout: 1500,
      position: 'topRight',

    });
  };

  const toastError = (message) => {
    iziToast.error({
      message: message,
      backgroundColor: '#e51e1e',
      messageColor: '#FFFFFF',
      icon: 'fa fa-times',
      iconColor: '#FFFFFF',
      timeout: 1500,
      position: 'topRight',
    });
  };
  const toastInfo = (message) => {
    iziToast.info({
      message: message,
      backgroundColor: '#2160de',
      messageColor: '#FFFFFF',
      icon: 'fa fa-info-circle',
      iconColor: '#FFFFFF',
      timeout: 1500,
      position: 'topRight',
    });
  };

  const toastWarning = (message) => {
    iziToast.warning({
      message: message,
      backgroundColor: '#e5811e',
      messageColor: '#212529',
      icon: 'fa fa-exclamation-triangle',
      iconColor: '#212529',
      timeout: 1500,
      size: 'small',
      position: 'topRight',
    });
  };

  document.getElementById('email').addEventListener('input', function() {
  const emailError = document.getElementById('error1');
  const emailValue = this.value.trim();
  const emailPattern = /^[a-zA-Z0-9._-]+@gmail\.com$/;

  emailError.style.display = "none"; 
  emailError.textContent = "";

  if (emailValue === "") {
      emailError.style.display = "block"; 
      emailError.textContent = "Email field cannot be empty.";
  } else if (!emailPattern.test(emailValue)) {
      emailError.style.display = "block"; 
      emailError.textContent = "Please enter a valid email address.";
  }
});

function validateEmptyField() {
  const emailError = document.getElementById('error1');
  const emailValue = document.getElementById('email').value.trim();
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  emailError.style.display = "none"; 
  emailError.textContent = "";

  let isValid = true;

  if (emailValue === "") {
      emailError.style.display = "block"; 
      emailError.textContent = "Email field cannot be empty.";
      isValid = false;
  }
  else if (!emailPattern.test(emailValue)) {
      emailError.style.display = "block"; 
      emailError.textContent = "Please enter a valid email address.";
      isValid = false;
  }

  return isValid;  
}


document.getElementById("forgotPasswordForm").addEventListener('submit', function(e) {
  e.preventDefault();

  if (!validateEmptyField()) return; 

  document.getElementById("preloader").style.display = "flex";
  
  const emailValue = document.getElementById('email').value.trim();
  
  const data = {
      email: emailValue
  };

  fetch('/forgot-password', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
      document.getElementById("preloader").style.display = "none";
      if (data.type === 'error') {
          document.getElementById('error1').style.display = "block";
          document.getElementById('error1').textContent = data.msg;
      } else {
          document.getElementById('error1').style.display = "none";
          toastSuccess(data.msg);
          document.getElementById('successMessage').style.display = "block";
          document.getElementById('successMessage').textContent = data.msg; 
          document.getElementById('email').disabled = true; 
      }
  })
  .catch(error => {
      document.getElementById("preloader").style.display = "none";
      toastWarning("Something went wrong. Please try again later.");
  });
});
