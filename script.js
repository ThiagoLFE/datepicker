//  ===========================================
//                  INPUT DATE
//  ===========================================

// Classe
class InputDate {
    constructor(id) {
        this.inputElement = document.getElementById(id);
        this.rawValue = "";
        this.displayValue = "";
        this.dateValue = null;
    }

    update(value) {
        this.rawValue = limitDateDigits(filterNumbers(value));
        this.displayValue = dateMaskABNT(this.rawValue);
        this.dateValue = parseDate(this.displayValue);

        this.inputElement.value = this.displayValue;
    }
}

// Helpers
function filterNumbers(value) {
    return value.replace(/\D/g, "");
}

function dateMaskABNT(value) {
    let maskValue = filterNumbers(value);

    if (maskValue?.length <= 2) return maskValue;

    if (maskValue?.length > 2 && maskValue?.length < 5)
        return maskValue.slice(0, 2) + "/" + maskValue.slice(2);

    if (maskValue?.length >= 5) {
        return (
            maskValue.slice(0, 2) +
            "/" +
            maskValue.slice(2, 4) +
            "/" +
            maskValue.slice(4)
        );
    }
}

function parseDate(maskValue) {
    let parts = maskValue.split("/");

    if (parts?.length != 3) {
        return null;
    }

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // this -1 is essencial because the months in Date starts in 0, and the input of user every time is 1 more.
    const year = parseInt(parts[2]);

    if (year < 1000) {
        return null;
    }

    const date = new Date(Date.UTC(year, month, day));

    console.log(date);

    const isDateValid =
        date.getUTCDate() === day &&
        date.getUTCMonth() === month &&
        date.getUTCFullYear() === year;

    if (!isDateValid) {
        return null;
    }
    return date;
}

function limitDateDigits(value) {
    return value.slice(0, 8);
}

// Elements

const inputDate = new InputDate("date");

// functions
function handleInput(event) {
    let newVal = event.target.value;

    inputDate.update(newVal);

    console.log(inputDate);
}

inputDate.inputElement.addEventListener("input", (evt) => handleInput(evt));

//  ===========================================
//                  INPUT popover
//  ===========================================

// Elements
const popoverRoot = document.getElementById("popover-root");
const popoverTrigger = document.getElementById("popover-trigger");
const popoverContent = document.getElementById("popover-content");

// Helpers

function openPopover() {
    popoverContent.classList.remove("hidden");
}

function closePopover() {
    popoverContent.classList.add("hidden");
}

function togglePopover() {
    const isHidden = popoverContent.classList.contains("hidden");

    if (isHidden) {
        openPopover();
        return;
    }

    closePopover();
}

// Listeners

popoverTrigger.addEventListener("click", togglePopover);

document.addEventListener("click", (event) => {
    const clickOnPopover = popoverRoot.contains(event.target);

    if (!clickOnPopover) {
        closePopover();
    }
});
