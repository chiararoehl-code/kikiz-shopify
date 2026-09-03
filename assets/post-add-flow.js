/**
 * Post-add flow controller: the single coordinator for whatever needs to
 * happen right after a configured box is successfully added to the cart,
 * ending in a redirect to /cart once every required step has succeeded.
 * It owns no UI itself — it only decides which step (if any) runs next, and
 * when to navigate — so steps stay decoupled from each other and from the
 * Box Builder.
 *
 * This is also the intended insertion point for a future optional Extras /
 * Greeting Card step: that step would run first in this same handler,
 * before Fulfillment, once it exists. Nothing about Extras is built here.
 *
 * Listens only to the existing `cart:updated` success event dispatched by
 * product-form.js, and the `fulfillment:updated` success event dispatched
 * by assets/fulfillment.js. Never touches box-builder.js or
 * product-form.js, and never redirects on an error path — cart:add:error
 * and a failed fulfillment save both simply don't dispatch the events this
 * file listens for.
 */
(function () {
  var FULFILLMENT_ATTRIBUTE = 'Fulfillment method';

  function getCartRoot() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  }

  function redirectToCart() {
    window.location.href = getCartRoot() + 'cart';
  }

  function hasFulfillmentMethod(cart) {
    return !!(cart && cart.attributes && cart.attributes[FULFILLMENT_ATTRIBUTE]);
  }

  document.addEventListener('cart:updated', function (event) {
    var cart = event.detail && event.detail.cart;
    if (!cart) return;

    // Future step order: an Extras step would decide here whether to run
    // first. For now, Fulfillment is the only post-add step. If the cart
    // already carries a fulfillment choice, there's nothing left to do —
    // go straight to Cart.
    if (hasFulfillmentMethod(cart)) {
      redirectToCart();
      return;
    }

    document.dispatchEvent(new CustomEvent('fulfillment:request', { detail: { cart: cart } }));
  });

  document.addEventListener('fulfillment:updated', function (event) {
    var detail = event.detail || {};
    if (!detail.fromPostAdd) return;
    redirectToCart();
  });
})();
