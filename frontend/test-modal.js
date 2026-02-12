// Script to test localStorage state and force modal show
console.log("=== Testing Location Permission Modal ===");
console.log("Current localStorage values:");
console.log("  locationPermissionAsked:", localStorage.getItem("locationPermissionAsked"));
console.log("  locationPermissionDenied:", localStorage.getItem("locationPermissionDenied"));
console.log("  deliveryAddressV2:", localStorage.getItem("deliveryAddressV2"));
console.log("  locationPermissionGranted:", localStorage.getItem("locationPermissionGranted"));

console.log("\nClearing location-related items for testing...");
localStorage.removeItem("locationPermissionAsked");
localStorage.removeItem("locationPermissionDenied");
localStorage.removeItem("locationPermissionGranted");

console.log("✓ Cleared. Reload the page to trigger the modal.");
