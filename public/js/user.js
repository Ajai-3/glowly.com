
document.addEventListener('DOMContentLoaded', function () {
    const priceElements = document.querySelectorAll('.price-inr'); 

    priceElements.forEach(element => {
        const price = parseInt(element.textContent.replace(/[^0-9]/g, ''), 10); 
        element.textContent = '₹ ' + price.toLocaleString('en-IN');  
    });
});

$(document).ready(function () {
    const offers = $('#offers-container .offer-item');
    let currentIndex = 0;
    const offerElement = $('#current-offer');

    if (offers.length > 0) {
        offerElement.text(offers.eq(currentIndex).text());
    }

    function showNextOffer() {
        if (offers.length === 0) return;

        const nextIndex = (currentIndex + 1) % offers.length;
        const nextOffer = offers.eq(nextIndex).text();

        offerElement.animate({ opacity: 0, marginTop: '-20px' }, 100, function () {
            setTimeout(function () {
                offerElement.text(nextOffer);
                offerElement.css({ opacity: 0, marginTop: '20px' });
                offerElement.animate({ opacity: 1, marginTop: '0px' }, 100);
                currentIndex = nextIndex;
            }, 3000);
        });
    }

    if (offers.length > 0) {
        setInterval(showNextOffer, 12000); 
    }
});

  
let preloaderTimeout;

window.addEventListener('load', function() {
    clearTimeout(preloaderTimeout);
    document.getElementById("preloader").style.display = "none";
    window.scrollTo(0, 0);
});

preloaderTimeout = setTimeout(function() {
    document.getElementById("preloader").style.display = "flex";
}, 100); 
