const menu = "Select a data bundle:";

const buttons = [
    { label: "Basic Package", action: "selectBasicPackage()" },
    { label: "Standard Package", action: "selectStandardPackage()" },
    { label: "Premium Package", action: "selectPremiumPackage()" },
    { label: "Confirm Selection", action: "confirmSelection()" }
];

// Function to display the menu and buttons
function displayMenu() {
    console.log(menu);
    buttons.forEach(button => {
        console.log(button.label);
    });
}