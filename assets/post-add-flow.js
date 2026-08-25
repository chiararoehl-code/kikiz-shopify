/**
 * Post-add flow controller: the single coordinator for whatever needs to
 * happen right after a configured box is successfully added to the cart.
 * It owns no UI itself — it only decides which step (if any) runs next —
 * so steps stay decoupled from each other and from the Box Builder.
 *
 * This is also the intended insertion point for a future optional Extras /
 * Greeting Card step: that step would run first in this same handler,
 * before Fulfillment, once it exists. Nothing about Extras is built here.
 *
 * Listens only to the existing `cart:updated` success event dispatched by
 * product-form.js. Never touches box-builder.js or product-form.js.
 */
(function () {
  var FULFILLMENT_ATTRIBUTE = 'Fulfillment method';

  function hasFulfillmentMethod(cart) {
    return !!(cart && cart.attributes && cart.attributes[FULFILLMENT_ATTRIBUTE]);
  }

  document.addEventListener('cart:updated', function (event) {
    var cart = event.detail && event.detail.cart;
    if (!cart) return;

    // Future step order: an Extras step would decide here whether to run
    // first. For now, Fulfillment is the only post-add step, and it only
    // runs when the cart doesn't already carry a fulfillment choice.
    if (hasFulfillmentMethod(cart)) return;

    document.dispatchEvent(new CustomEvent('fulfillment:request', { detail: { cart: cart } }));
  });
})();
