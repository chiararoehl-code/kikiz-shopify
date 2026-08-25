/**
 * Box builder: pick a box size, then pick flavors until the box is full.
 * State lives here, not in the DOM — DOM is only ever written to, never
 * read back for quantities. The actual Ajax add-to-cart request itself is
 * delegated entirely to product-form.js via a plain `[data-product-form]`;
 * this file only populates that form's hidden inputs before submit and
 * reacts to the `cart:updated` / `cart:add:error` events it dispatches.
 */
(function () {
  var modal = document.querySelector('[data-box-builder]');
  if (!modal) return;

  var panel = modal.querySelector('.box-builder__panel');
  var titleEl = modal.querySelector('[data-box-builder-title]');
  var counterEl = modal.querySelector('[data-box-builder-counter]');
  var errorEl = modal.querySelector('[data-box-builder-error]');
  var submitButton = modal.querySelector('[data-box-builder-submit]');
  var form = modal.querySelector('[data-product-form]');
  var variantInput = modal.querySelector('[data-box-builder-variant-input]');
  var propertiesContainer = modal.querySelector('[data-box-builder-properties]');
  var flavorItems = Array.prototype.slice.call(
    modal.querySelectorAll('[data-flavor-select-item]')
  );

  if (!panel || !form || !submitButton || !variantInput || !propertiesContainer) return;

  var tplBuildYour = modal.dataset.tplBuildYour || 'BUILD YOUR __SIZE__';
  var tplCounter = modal.dataset.tplCounter || '__SELECTED__ / __TOTAL__ SELECTED';
  var tplBoxReady = modal.dataset.tplBoxReady || 'BOX READY';
  var tplSelectCookies = modal.dataset.tplSelectCookies || 'SELECT __SIZE__ COOKIES';
  var tplSelectMore = modal.dataset.tplSelectMore || 'SELECT __COUNT__ MORE';
  var labelAddToCart = submitButton.dataset.defaultLabel || 'ADD BOX TO CART';

  var state = {
    boxSize: 0,
    variantId: null,
    selections: {},
    selectedCount: 0
  };

  var lastTrigger = null;
  var isSubmitting = false;

  function fillTemplate(template, replacements) {
    var result = template;
    Object.keys(replacements).forEach(function (token) {
      result = result.split(token).join(replacements[token]);
    });
    return result;
  }

  function renderFlavorItem(item) {
    var key = item.dataset.flavorKey;
    var qty = state.selections[key] || 0;
    var addButton = item.querySelector('[data-flavor-add]');
    var stepper = item.querySelector('[data-flavor-stepper]');
    var qtyEl = item.querySelector('[data-flavor-qty]');

    if (qty > 0) {
      if (addButton) addButton.hidden = true;
      if (stepper) stepper.hidden = false;
      if (qtyEl) qtyEl.textContent = qty;
    } else {
      if (addButton) addButton.hidden = false;
      if (stepper) stepper.hidden = true;
      if (qtyEl) qtyEl.textContent = '0';
    }
  }

  function renderAllFlavorItems() {
    flavorItems.forEach(renderFlavorItem);
  }

  function renderPlusAvailability() {
    var isFull = state.selectedCount >= state.boxSize;
    flavorItems.forEach(function (item) {
      item.querySelectorAll('[data-flavor-plus], [data-flavor-add]').forEach(function (btn) {
        btn.disabled = isFull;
      });
    });
  }

  function renderCounter() {
    if (!counterEl) return;
    var isFull = state.boxSize > 0 && state.selectedCount >= state.boxSize;
    counterEl.classList.toggle('box-builder__counter--full', isFull);
    counterEl.textContent = isFull
      ? tplBoxReady
      : fillTemplate(tplCounter, {
          __SELECTED__: state.selectedCount,
          __TOTAL__: state.boxSize
        });
  }

  function renderSubmitState() {
    var remaining = state.boxSize - state.selectedCount;
    if (remaining > 0) {
      submitButton.disabled = true;
      submitButton.textContent =
        state.selectedCount === 0
          ? fillTemplate(tplSelectCookies, { __SIZE__: state.boxSize })
          : fillTemplate(tplSelectMore, { __COUNT__: remaining });
    } else {
      submitButton.disabled = false;
      submitButton.textContent = labelAddToCart;
    }
  }

  function renderAll() {
    renderAllFlavorItems();
    renderPlusAvailability();
    renderCounter();
    renderSubmitState();
  }

  function showError(message) {
    if (!errorEl) return;
    if (message) errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.hidden = true;
  }

  function resetState(boxSize, variantId) {
    state.boxSize = boxSize;
    state.variantId = variantId;
    state.selections = {};
    state.selectedCount = 0;
  }

  function openBuilder(trigger) {
    var boxSize = parseInt(trigger.dataset.boxSize, 10);
    var variantId = trigger.dataset.variantId;
    if (!boxSize || !variantId) return;

    lastTrigger = trigger;
    resetState(boxSize, variantId);
    clearError();
    isSubmitting = false;

    if (titleEl) titleEl.textContent = fillTemplate(tplBuildYour, { __SIZE__: boxSize });
    variantInput.value = variantId;

    renderAll();

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    var closeButton = modal.querySelector('.box-builder__close');
    if (closeButton) closeButton.focus();

    document.addEventListener('keydown', onKeydown);
  }

  function closeBuilder() {
    modal.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);

    resetState(0, null);
    clearError();
    renderAll();

    if (lastTrigger) {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function onKeydown(event) {
    if (event.key === 'Escape') closeBuilder();
  }

  function handlePlus(key) {
    if (state.selectedCount >= state.boxSize) return;
    state.selections[key] = (state.selections[key] || 0) + 1;
    state.selectedCount += 1;
    renderAll();
  }

  function handleMinus(key) {
    var current = state.selections[key] || 0;
    if (current <= 0) return;
    state.selections[key] = current - 1;
    if (state.selections[key] === 0) delete state.selections[key];
    state.selectedCount -= 1;
    renderAll();
  }

  function populateFormAndSubmit() {
    if (state.selectedCount !== state.boxSize) return;

    propertiesContainer.innerHTML = '';

    flavorItems.forEach(function (item) {
      var key = item.dataset.flavorKey;
      var qty = state.selections[key] || 0;
      if (qty <= 0) return;

      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'properties[' + item.dataset.flavorName + ']';
      input.value = String(qty);
      propertiesContainer.appendChild(input);
    });

    clearError();
    isSubmitting = true;
  }

  document.addEventListener('click', function (event) {
    var openTrigger = event.target.closest('[data-box-open]');
    if (openTrigger) {
      openBuilder(openTrigger);
      return;
    }

    if (event.target.closest('[data-box-builder-close]')) {
      closeBuilder();
      return;
    }

    var plusButton = event.target.closest('[data-flavor-plus], [data-flavor-add]');
    if (plusButton && modal.contains(plusButton)) {
      var plusItem = plusButton.closest('[data-flavor-select-item]');
      if (plusItem) handlePlus(plusItem.dataset.flavorKey);
      return;
    }

    var minusButton = event.target.closest('[data-flavor-minus]');
    if (minusButton && modal.contains(minusButton)) {
      var minusItem = minusButton.closest('[data-flavor-select-item]');
      if (minusItem) handleMinus(minusItem.dataset.flavorKey);
      return;
    }

    if (event.target.closest('[data-box-builder-submit]')) {
      populateFormAndSubmit();
    }
  });

  document.addEventListener('cart:updated', function () {
    if (!isSubmitting) return;
    isSubmitting = false;
    window.setTimeout(closeBuilder, 700);
  });

  document.addEventListener('cart:add:error', function () {
    if (!isSubmitting) return;
    isSubmitting = false;
    showError();
  });
})();
