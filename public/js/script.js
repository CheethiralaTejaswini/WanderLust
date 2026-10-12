(() => {
    'use strict';

    // 1. Bootstrap custom validation styles
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // 2. Tax Switcher (Airbnb style: toggle before / after taxes)
    const taxSwitch = document.getElementById('taxSwitch');
    if (taxSwitch) {
        taxSwitch.addEventListener('change', () => {
            const isTaxesOn = taxSwitch.checked;
            const priceDisplays = document.querySelectorAll('.price-display');
            const taxLabels = document.querySelectorAll('.tax-info');

            priceDisplays.forEach(el => {
                const base = Number(el.getAttribute('data-base-price'));
                if (!isNaN(base)) {
                    if (isTaxesOn) {
                        const withTax = Math.round(base * 1.18);
                        el.innerHTML = '&#8377; ' + withTax.toLocaleString('en-IN');
                    } else {
                        el.innerHTML = '&#8377; ' + base.toLocaleString('en-IN');
                    }
                }
            });

            taxLabels.forEach(el => {
                if (isTaxesOn) {
                    el.classList.remove('d-none');
                } else {
                    el.classList.add('d-none');
                }
            });
        });
    }

    // 3. Auto dismiss flash alerts
    const alerts = document.querySelectorAll('.modern-alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) bsAlert.close();
        }, 5000);
    });

    // 4. Interactive Cab Type radio cards selection
    const cabCards = document.querySelectorAll('.cab-type-card');
    cabCards.forEach(card => {
        card.addEventListener('click', () => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                cabCards.forEach(c => c.classList.remove('selected-cab'));
                card.classList.add('selected-cab');
                radio.dispatchEvent(new Event('change'));
            }
        });
    });

    // 5. Scroll active category into view
    const activeCategory = document.querySelector('.active-category');
    if (activeCategory && activeCategory.parentElement) {
        activeCategory.parentElement.scrollTo({
            left: activeCategory.offsetLeft - 80,
            behavior: 'smooth'
        });
    }
})();