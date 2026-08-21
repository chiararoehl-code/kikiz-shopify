/**
 * Progressive enhancement for `[data-product-form]` forms.
 * Without JS the form posts normally to routes.cart_add_url.
 * With JS, adds via the Ajax Cart API and dispatches `cart:updated`
 * so a future cart drawer (or any other listener) can react without
 * this file needing to know about it.
 */
(function () {
  var STATE_RESET_DELAY = 1800;

  function getCartRoot() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  }

  function updateCartCount(cart) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
  }

  function setButtonLabel(button, label) {
    if (label) button.textContent = label;
  }

  function resetButton(button, defaultLabel) {
    button.classList.remove('is-loading', 'is-added', 'has-error');
    button.disabled = false;
    setButtonLabel(button, defaultLabel);
  }

  function handleSubmit(event) {
    var form = event.target.closest('[data-product-form]');
    if (!form) return;

    var button = form.querySelector('[data-add-to-cart-button]');
    if (!button || button.disabled) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    var defaultLabel = button.dataset.defaultLabel || button.textContent.trim();
    var successLabel = button.dataset.successLabel || defaultLabel;
    var errorLabel = button.dataset.errorLabel || defaultLabel;

    button.disabled = true;
    button.classList.remove('is-added', 'has-error');
    button.classList.add('is-loading');

    fetch(getCartRoot() + 'cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw data;
          return data;
        });
      })
      .then(function (addedItem) {
        return fetch(getCartRoot() + 'cart.js', { headers: { Accept: 'application/json' } })
          .then(function (response) { return response.json(); })
          .then(function (cart) {
            updateCartCount(cart);
            document.dispatchEvent(
              new CustomEvent('cart:updated', { detail: { cart: cart, addedItem: addedItem } })
            );

            button.classList.remove('is-loading');
            button.classList.add('is-added');
            setButtonLabel(button, successLabel);

            window.setTimeout(function () {
              resetButton(button, defaultLabel);
            }, STATE_RESET_DELAY);
          });
      })
      .catch(function (error) {
        button.classList.remove('is-loading');
        button.classList.add('has-error');
        setButtonLabel(button, errorLabel);
        button.disabled = false;

        window.setTimeout(function () {
          resetButton(button, defaultLabel);
        }, STATE_RESET_DELAY);

        if (window.console) {
          console.error('[product-form]', (error && error.description) || error);
        }
      });
  }

  document.addEventListener('submit', handleSubmit);
})();
