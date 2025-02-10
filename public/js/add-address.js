



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

  document.addEventListener("DOMContentLoaded", () => {
    const addAddressBtn = document.getElementById("add-address-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const viewAddressDiv = document.getElementById("view-address");
    const addAddressDiv = document.getElementById("add-address");
    const breadcrumbs = document.getElementById("breadcrumbs");

    addAddressBtn.addEventListener("click", () => {
      viewAddressDiv.style.display = "none";
      addAddressDiv.style.display = "block";

      breadcrumbs.innerHTML = `
        <a href="/home">Home</a> > 
        <a href="/my-account">My Account</a> > 
        <a href="/manage-address">Manage Address</a> > 
        <a href="###">Add New Address</a>
      `;
    });

    cancelBtn.addEventListener("click", () => {
      addAddressDiv.style.display = "none";
      viewAddressDiv.style.display = "block";

      breadcrumbs.innerHTML = `
        <a href="/home">Home</a> > 
        <a href="/manage-address">Manage Address</a>
      `;
    });
  });

  document.querySelectorAll('.remove-address-form').forEach(form => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const addressId = form.getAttribute('data-id');

      const popup = document.getElementById('customPopup');
      popup.classList.remove('hidden');

      const confirmButton = document.getElementById('confirmButton');
      const cancelButton = document.getElementById('cancelButton');

      confirmButton.addEventListener('click', async () => {
        try {
          const response = await fetch(`/remove-address/${addressId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();

          if (response.ok) {
            toastSuccess(result.message)
            setTimeout(() => {
              window.location.href = "/manage-address";
            }, 1500)
          } else {
            toastError(result.message)
          }
        } catch (error) {
          toastWarning('Something went wrong!')
        }

        popup.classList.add('hidden');
      });

      cancelButton.addEventListener('click', () => {
        popup.classList.add('hidden');
      });
    });
  });


  function addressFormValidation(prefix) {
    let isValid = true;

    const addErrorBorder = (element) => {
      if (element) {
        element.style.border = "1px solid var(--red-text-color-4)";
      }
    };

    const addValidBorder = (element) => {
      if (element) {
        element.style.border = "1px solid var(--green-text-color-2)";
      }
    };

    const resetBorder = (element) => {
      if (element) {
        element.style.border = "";
      }
    };

    const city = document.getElementById(prefix + 'city');
    if (city) {
      const cityError = document.getElementById(prefix + 'cityError');
      if (!city.value.trim() || !/^[a-zA-Z\s]+$/.test(city.value.trim())) {
        cityError.textContent = "Please enter a valid city name (letters and spaces only).";
        cityError.style.display = "block";
        addErrorBorder(city);
        isValid = false;
      } else {
        cityError.style.display = "none";
        addValidBorder(city);
      }
    }

    const district = document.getElementById(prefix + 'district');
    if (district) {
      const districtError = document.getElementById(prefix + 'districtError');
      if (!district.value.trim() || !/^[a-zA-Z\s]+$/.test(district.value.trim())) {
        districtError.textContent = "Please enter a valid district name (letters and spaces only).";
        districtError.style.display = "block";
        addErrorBorder(district);
        isValid = false;
      } else {
        districtError.style.display = "none";
        addValidBorder(district);
      }
    }

    const state = document.getElementById(prefix + 'state');
    if (state) {
      const stateError = document.getElementById(prefix + 'stateError');
      if (!state.value.trim() || !/^[a-zA-Z\s]+$/.test(state.value.trim())) {
        stateError.textContent = "Please enter a valid state name (letters and spaces only).";
        stateError.style.display = "block";
        addErrorBorder(state);
        isValid = false;
      } else {
        stateError.style.display = "none";
        addValidBorder(state);
      }
    }

    const country = document.getElementById(prefix + 'country');
    if (country) {
      const countryError = document.getElementById(prefix + 'countryError');
      if (!country.value.trim() || !/^[a-zA-Z\s]+$/.test(country.value.trim())) {
        countryError.textContent = "Please enter a valid country name (letters and spaces only).";
        countryError.style.display = "block";
        addErrorBorder(country);
        isValid = false;
      } else {
        countryError.style.display = "none";
        addValidBorder(country);
      }
    }

    const address = document.getElementById(prefix + 'address');
    if (address) {
      const addressError = document.getElementById(prefix + 'addressError');
      if (!address.value.trim()) {
        addressError.textContent = 'Address is required';
        addressError.style.display = "block";
        addErrorBorder(address);
        isValid = false;
      } else {
        addressError.style.display = "none";
        addValidBorder(address);
      }
    }

    const pincode = document.getElementById(prefix + 'pincode');
    if (pincode) {
      const pincodeError = document.getElementById(prefix + 'pincodeError');
      if (!pincode.value.trim() || isNaN(pincode.value.trim()) || pincode.value.trim().length !== 6) {
        pincodeError.textContent = 'Enter a valid 6-digit Pincode';
        pincodeError.style.display = "block";
        addErrorBorder(pincode);
        isValid = false;
      } else {
        pincodeError.style.display = "none";
        addValidBorder(pincode);
      }
    }

    const landmark = document.getElementById(prefix + 'land_mark');
    if (landmark) {
      const landmarkError = document.getElementById(prefix + 'LandMarkError');
      if (landmark.value.trim() && landmark.value.trim().length >= 3) {
        landmarkError.style.display = "none";
        addValidBorder(landmark);
      } else if (landmark.value.trim()) {
        landmarkError.textContent = 'Landmark should be at least 3 characters long';
        landmarkError.style.display = "block";
        addErrorBorder(landmark);
        isValid = false;
      } else {
        resetBorder(landmark);
        landmarkError.style.display = "none";
      }
    }

    const alternativePhone = document.getElementById(prefix + 'alternative_phone_no');
    if (alternativePhone) {
      const phoneError = document.getElementById(prefix + 'phoneError');
      if (alternativePhone.value.trim() && alternativePhone.value.trim().length >= 10 && !isNaN(alternativePhone.value.trim())) {
        phoneError.style.display = "none";
        addValidBorder(alternativePhone);
      } else if (alternativePhone.value.trim()) {
        phoneError.textContent = 'Enter a valid phone number';
        phoneError.style.display = "block";
        addErrorBorder(alternativePhone);
        isValid = false;
      } else {
        resetBorder(alternativePhone);
        phoneError.style.display = "none";
      }
    }

    const alternativeEmail = document.getElementById(prefix + 'alternative_email');
    if (alternativeEmail) {
      const emailError = document.getElementById(prefix + 'email');
      if (alternativeEmail.value.trim() && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(alternativeEmail.value.trim())) {
        emailError.style.display = "none";
        addValidBorder(alternativeEmail);
      } else if (alternativeEmail.value.trim()) {
        emailError.textContent = 'Enter a valid email address';
        emailError.style.display = "block";
        addErrorBorder(alternativeEmail);
        isValid = false;
      } else {
        resetBorder(alternativeEmail);
        emailError.style.display = "none";
      }
    }

    const addressType = document.querySelector(`input[name="${prefix}address_type"]:checked`);
    if (addressType) {
      const checkboxError = document.getElementById(prefix + 'checkboxError');
      checkboxError.style.display = "none";
    } else {
      const checkboxError = document.getElementById(prefix + 'checkboxError');
      checkboxError.textContent = 'Please select an address type.';
      checkboxError.style.display = "block";
      isValid = false;
    }

    return isValid;
  }


  document.addEventListener("DOMContentLoaded", () => {
    const editAddressDiv = document.getElementById("edit-address");
    const editAddressForm = document.getElementById("editAddressForm");
    const viewAddressDiv = document.getElementById("view-address");

    // Fetching and displaying the address data for editing
    document.querySelectorAll('.edit-address-form').forEach(form => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const addressId = form.getAttribute('data-id');
        try {
          const response = await fetch(`/get-address/${addressId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const result = await response.json();
          if (response.ok) {
            // Populate form fields with existing address data
            document.getElementById('edit_address_id').value = result._id;
            document.getElementById('edit_city').value = result.city;
            document.getElementById('edit_district').value = result.district;
            document.getElementById('edit_state').value = result.state;
            document.getElementById('edit_country').value = result.country;
            document.getElementById('edit_address').value = result.address;
            document.getElementById('edit_pincode').value = result.pin_code;
            document.getElementById('edit_land_mark').value = result.land_mark;
            document.getElementById('edit_alternative_phone_no').value = result.alternative_phone_no;
            document.getElementById('edit_alternative_email').value = result.alternative_email;
            document.getElementById(`edit_address_type_${result.address_type}`).checked = true;

            viewAddressDiv.style.display = 'none';
            editAddressDiv.style.display = 'block';
          } else {
            toastSuccess(result.message);
          }
        } catch (error) {
          toastError('Something went wrong!');
        }
      });
    });

    // Submitting the edited address form
    editAddressForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!addressFormValidation('edit_')) {
        return;
      }

      const addressId = document.getElementById('edit_address_id').value;
      const data = {
        city: document.getElementById('edit_city').value,
        district: document.getElementById('edit_district').value,
        state: document.getElementById('edit_state').value,
        country: document.getElementById('edit_country').value,
        address: document.getElementById('edit_address').value,
        pin_code: document.getElementById('edit_pincode').value,
        address_type: document.querySelector('input[name="edit_address_type"]:checked').value,
        land_mark: document.getElementById('edit_land_mark').value,
        alternative_phone_no: document.getElementById('edit_alternative_phone_no').value,
        alternative_email: document.getElementById('edit_alternative_email').value,
      };

      try {
        const response = await fetch(`/edit-address/${addressId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
          toastSuccess(result.message);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toastError(result.message);
        }
      } catch (error) {
        toastWarning('Something went wrong!');
      }
    });

    // Add address form validation
    document.getElementById('addAddressForm').addEventListener('submit', function(event) {
      if (!addressFormValidation('')) {
        event.preventDefault();
      }
    });
  });