window.onload = function() {
    clearTimeout(preloaderTimeout);
    document.getElementById("preloader").style.display = "none";
    window.scrollTo(0, 0);
};

let preloaderTimeout = setTimeout(function() {
    document.getElementById("preloader").style.display = "flex"; 
}, 100);

// Sign-Up Form Elements
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone_no');
const passwordInput = document.getElementById('password');
const repeatPasswordInput = document.getElementById('repeatPassword');

// Error Message
const nameError = document.getElementById('error1');
const phoneError = document.getElementById('error2');
const emailError = document.getElementById('error3');
const passwordError = document.getElementById('error4');
const repeatPasswordError = document.getElementById('error5');

const signupForm = document.getElementById('signup_form');

// Validation Functions
function validateName() {
    const nameValue = nameInput.value;
    const namePattern = /^[A-Za-z\s]+$/;
    if (nameValue.trim() === "") {
        nameError.style.display = "block";
        nameError.textContent = "Please enter a valid name.";
        return false;
    } else if (!namePattern.test(nameValue)) {
        nameError.style.display = "block";
        nameError.textContent = "Please enter a valid name (letters only).";
        return false;
    } else {
        nameError.style.display = "none";
        nameError.textContent = "";
        return true;
    }
}

function validatePhone() {
    const phoneValue = phoneInput.value;
    if (phoneValue.length !== 10) {
        phoneError.style.display = "block";
        phoneError.textContent = "Phone number must be 10 digits.";
        return false;
    } else {
        phoneError.style.display = "none";
        phoneError.textContent = "";
        return true;
    }
}

function validateEmail() {
    const emailValue = emailInput.value;
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(emailValue)) {
        emailError.style.display = "block";
        emailError.textContent = "Please enter a valid email address.";
        return false;
    } else {
        emailError.style.display = "none";
        emailError.textContent = "";
        return true;
    }
}

function validatePassword() {
    const passwordValue = passwordInput.value;
    const repeatPasswordValue = repeatPasswordInput.value;
    const hasAlphabet = /[a-zA-Z]/;
    const hasDigit = /\d/;

    if (passwordValue.length < 8) {
        passwordError.style.display = "block"; 
        passwordError.textContent = "Password must be at least 8 characters.";
        return false;
    } else if (!hasAlphabet.test(passwordValue) || !hasDigit.test(passwordValue)) {
        passwordError.style.display = "block"; 
        passwordError.textContent = "Password must contain both letters and numbers.";
        return false;
    } else {
        passwordError.style.display = "none"; 
        passwordError.textContent = "";
    }

    if (passwordValue !== repeatPasswordValue) {
        repeatPasswordError.style.display = "block";
        repeatPasswordError.textContent = "Passwords do not match.";
        return false;
    } else {
        repeatPasswordError.style.display = "none"; 
        repeatPasswordError.textContent = "";
    }

    return true;
}

// Event Listener for Form Submission
document.addEventListener('DOMContentLoaded', function () {
    signupForm.addEventListener('submit', function (e) {
        document.getElementById("preloader").style.display = "flex";
        validateName();
        validatePhone();
        validateEmail();
        validatePassword();
        if (!validateName() || !validatePhone() || !validateEmail() || !validatePassword()) {
            e.preventDefault();
            document.getElementById("preloader").style.display = "none";
        }
    });
});

// Sign up page password EYE
const togglePassword = document.querySelectorAll('.togglePassword');
const password = document.querySelectorAll('.password');
const icon = document.querySelectorAll('.togglePassword i');

togglePassword.forEach((toggle, index) => {
    toggle.addEventListener('click', function () {
        const type = password[index].type === 'password' ? 'text' : 'password';
        password[index].type = type;

        icon[index].classList.toggle('fa-eye');
        icon[index].classList.toggle('fa-eye-slash');
    });
});







// OTP Timer
let timerInterval; 
let timeLeft = 120; 
const displayTimer = document.getElementById('timer');
const resendButton = document.getElementById('resend-otp-btn');

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;

    const otpInput = document.getElementById("otp");
    const timerValue = document.getElementById("timervalue");

    if (otpInput && timerValue) {
        otpInput.disabled = false;
        timerValue.classList.remove("expired");
    }

    // Disable the Resend OTP button initially
    resendButton.disabled = true;

    timerInterval = setInterval(() => {
        if (timeLeft >= 0) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            displayTimer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            timeLeft--;
        } else {
            clearInterval(timerInterval);
            displayTimer.textContent = "Expired";
            if (otpInput && timerValue) {
                otpInput.disabled = true;
                timerValue.classList.add("expired");
            }
            enableResendOTP();
        }
    }, 1000);
}

function enableResendOTP() {
    // Enable the Resend OTP button when the timer expires
    resendButton.disabled = false;
}

document.addEventListener('DOMContentLoaded', function () {
    const otpForm = document.getElementById('otp_form'); 
    if (otpForm) {
        startTimer(); 
    }
});

function validateOTPForm() {
    const otpInput = document.getElementById('otp').value;

    if (!/^\d{6}$/.test(otpInput)) {
        Swal.fire({
            icon: "error",
            title: "Invalid OTP",
            text: "OTP must be 6 digits.",
            customClass: {
                popup: "swal-dark-popup",
                title: "swal-dark-title",
                content: "swal-dark-content",
            },
        });
        return false;
    }

    $.ajax({
        type: "POST",
        url: "/otp-verification",
        data: { otp: otpInput },
        success: function (response) {
            if (response.success) {
                if (response.msg) {
                    $('.alert').text(response.msg).addClass('alert-success');
                }

                Swal.fire({
                    position: "center",
                    icon: "success",
                    title: "Successful",
                    showConfirmButton: false,
                    timer: 1500,
                    customClass: {
                        popup: "swal-dark-popup",
                        title: "swal-dark-title",
                        content: "swal-dark-content",
                    },
                }).then(() => {
                    window.location.href = response.redirectUrl;
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: response.message,
                    customClass: {
                        popup: "swal-dark-popup",
                        title: "swal-dark-title",
                        content: "swal-dark-content",
                    },
                });
            }
        },
        error: function (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Something went wrong. Please try again.",
                customClass: {
                    popup: "swal-dark-popup",
                    title: "swal-dark-title",
                    content: "swal-dark-content",
                },
            });
        },
    });

    return false;
}

function resendOTP() {
    clearInterval(timerInterval);
    startTimer();

    $.ajax({
        type: "POST",
        url: "/resend-otp",
        success: function (response) {
            if (response.success) {
                Swal.fire({
                    icon: "success",
                    title: "OTP Resent Successfully..! ",
                    showConfirmButton: false,
                    timer: 1500,
                    customClass: {
                        popup: "swal-dark-popup",
                        title: "swal-dark-title",
                        content: "swal-dark-content",
                    },
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: response.msg, 
                    customClass: {
                        popup: "swal-dark-popup",
                        title: "swal-dark-title",
                        content: "swal-dark-content",
                    },
                }).then(() => {
                    if (response.message.includes("User session not found")) {
                        window.location.href = '/signup';
                    }
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('AJAX error:', error); 
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Something went wrong, please try again later.",
                customClass: {
                    popup: "swal-dark-popup",
                    title: "swal-dark-title",
                    content: "swal-dark-content",
                },
            });
        }
    });
}



