/**
 * Fulfillment chooser: Pickup vs Delivery, written to the Shopify-native
 * cart attribute `Fulfillment method` via the Cart API. This file owns the
 * chooser UI and the attribute write only — it never decides *when* to open
 * after an add (that's assets/post-add-flow.js's job via the
 * `fulfillment:request` event) and it never touches flavor/box state.
 *
 * Opens on:
 *  - `fulfillment:request` (dispatched by post-add-flow.js after a
 *    successful box add with no existing fulfillment choice)
 *  - a click on any [data-fulfillment-open] trigger (e.g. the cart page's
 *    CHOOSE/CHANGE control)
 *  - a click on [data-cart-checkout] when no fulfillment choice exists yet
 *    (guards Checkout, then resumes it automatically once a choice is made)
 */
(function () {
  var chooser = document.querySelector('[data-fulfillment-chooser]');
  if (!chooser) return;

  var panel = chooser.querySelector('.fulfillment-chooser__panel');
  var errorEl = chooser.querySelector('[data-fulfillment-error]');
  var optionButtons = Array.prototype.slice.call(
    chooser.querySelectorAll('[data-fulfillment-option]')
  );

  if (!panel || optionButtons.length === 0) return;

  var ATTRIBUTE_KEY = 'Fulfillment method';

  function getCartRoot() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  }

  var currentFulfillment = document.body.dataset.fulfillmentMethod || '';
  var lastTrigger = null;
  var pendingCheckoutTrigger = null;
  var isSubmitting = false;

  function showError() {
    if (errorEl) errorEl.hidden = false;
  }

  function clearError() {
    if (errorEl) errorEl.hidden = true;
  }

  function renderSelectedState() {
    optionButtons.forEach(function (btn) {
      var isSelected = btn.dataset.fulfillmentValue === currentFulfillment;
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  function updateCartSummaries() {
    document.body.dataset.fulfillmentMethod = currentFulfillment;

    document.querySelectorAll('[data-fulfillment-summary]').forEach(function (el) {
      el.textContent = currentFulfillment || el.dataset.fulfillmentEmptyLabel || '';
    });

    document.querySelectorAll('[data-fulfillment-open]').forEach(function (el) {
      if (!el.dataset.fulfillmentChooseLabel || !el.dataset.fulfillmentChangeLabel) return;
      el.textContent = currentFulfillment
        ? el.dataset.fulfillmentChangeLabel
        : el.dataset.fulfillmentChooseLabel;
    });
  }

  function openChooser(trigger) {
    lastTrigger = trigger || null;
    clearError();
    renderSelectedState();

    chooser.hidden = false;
    document.body.style.overflow = 'hidden';

    var closeButton = chooser.querySelector('.fulfillment-chooser__close');
    if (closeButton) closeButton.focus();

    document.addEventListener('keydown', onKeydown);
  }

  function closeChooser() {
    chooser.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);

    if (lastTrigger) lastTrigger.focus();
    lastTrigger = null;
  }

  function onKeydown(event) {
    if (event.key === 'Escape') closeChooser();
  }

  function setFulfillmentMethod(value) {
    if (isSubmitting) return;
    isSubmitting = true;
    clearError();
    optionButtons.forEach(function (btn) {
      btn.disabled = true;
    });

    var payload = { attributes: {} };
    payload.attributes[ATTRIBUTE_KEY] = value;

    fetch(getCartRoot() + 'cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw data;
          return data;
        });
      })
      .then(function () {
        isSubmitting = false;
        optionButtons.forEach(function (btn) {
          btn.disabled = false;
        });

        currentFulfillment = value;
        updateCartSummaries();
        closeChooser();

        if (pendingCheckoutTrigger) {
          var trigger = pendingCheckoutTrigger;
          pendingCheckoutTrigger = null;
          trigger.click();
        }
      })
      .catch(function (error) {
        isSubmitting = false;
        optionButtons.forEach(function (btn) {
          btn.disabled = false;
        });
        showError();

        if (window.console) {
          console.error('[fulfillment]', error);
        }
      });
  }

  document.addEventListener('fulfillment:request', function () {
    openChooser(null);
  });

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-fulfillment-close]')) {
      closeChooser();
      return;
    }

    var optionButton = event.target.closest('[data-fulfillment-option]');
    if (optionButton && chooser.contains(optionButton)) {
      setFulfillmentMethod(optionButton.dataset.fulfillmentValue);
      return;
    }

    var openTrigger = event.target.closest('[data-fulfillment-open]');
    if (openTrigger) {
      openChooser(openTrigger);
      return;
    }

    var checkoutTrigger = event.target.closest('[data-cart-checkout]');
    if (checkoutTrigger && !currentFulfillment) {
      event.preventDefault();
      pendingCheckoutTrigger = checkoutTrigger;
      openChooser(checkoutTrigger);
    }
  });
})();
