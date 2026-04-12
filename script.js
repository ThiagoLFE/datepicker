//  ===========================================
//                  INPUT DATE
//  ===========================================

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

    updateFromDate(date) {
        if (!(date instanceof Date)) return;

        const day = String(date.getUTCDate()).padStart(2, "0");
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const year = String(date.getUTCFullYear());

        const rawValue = `${day}${month}${year}`;
        this.update(rawValue);
    }
}

function filterNumbers(value) {
    return value.replace(/\D/g, "");
}

function dateMaskABNT(value) {
    let maskValue = filterNumbers(value);

    if (maskValue.length <= 2) return maskValue;

    if (maskValue.length < 5) {
        return maskValue.slice(0, 2) + "/" + maskValue.slice(2);
    }

    return (
        maskValue.slice(0, 2) +
        "/" +
        maskValue.slice(2, 4) +
        "/" +
        maskValue.slice(4, 8)
    );
}

function parseDate(maskValue) {
    const parts = maskValue.split("/");

    if (parts.length !== 3) {
        return null;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (year < 1000) {
        return null;
    }

    const date = new Date(Date.UTC(year, month, day));

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

//  ===========================================
//                  POPOVER
//  ===========================================

const popoverRoot = document.getElementById("popover-root");
const popoverTrigger = document.getElementById("popover-trigger");
const popoverContent = document.getElementById("popover-content");

const POSITION_CLASSES = ["top-full", "bottom-full", "mt-2", "mb-2", "left-0"];

function clearPopoverPositionClasses() {
    POSITION_CLASSES.forEach((className) => {
        popoverContent.classList.remove(className);
    });
}

function applyPopoverBottom() {
    clearPopoverPositionClasses();
    popoverContent.classList.add("top-full", "mt-2", "left-0");
}

function applyPopoverTop() {
    clearPopoverPositionClasses();
    popoverContent.classList.add("bottom-full", "mb-2", "left-0");
}

function showPopoverForMeasure() {
    popoverContent.classList.remove("hidden");
    popoverContent.classList.add("invisible");
}

function hideMeasureState() {
    popoverContent.classList.remove("invisible");
}

function resolvePopoverVerticalPosition() {
    showPopoverForMeasure();

    applyPopoverBottom();

    const triggerRect = popoverTrigger.getBoundingClientRect();
    const contentRect = popoverContent.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    const fitsBelow = spaceBelow >= contentRect.height + 8;
    const fitsAbove = spaceAbove >= contentRect.height + 8;

    if (fitsBelow || !fitsAbove) {
        applyPopoverBottom();
    } else {
        applyPopoverTop();
    }

    hideMeasureState();
}

function openPopover() {
    popoverContent.classList.remove("hidden");
    resolvePopoverVerticalPosition();
}

function closePopover() {
    popoverContent.classList.add("hidden");
    popoverContent.classList.remove("invisible");
}

function togglePopover() {
    const isHidden = popoverContent.classList.contains("hidden");

    if (isHidden) {
        openPopover();
        return;
    }

    closePopover();
}

//  ===========================================
//                  DATE PICKER
//  ===========================================

const inputDate = new InputDate("date");
const calendarTitle = document.getElementById("calendar-title");
const calendarGrid = document.getElementById("calendar-grid");
const prevMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");

const MONTH_NAMES = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
];

const datePickerState = {
    selectedDate: null,
    viewDate: new Date(),
};

function getDaysInMonthUTC(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getFirstDayOfMonthUTC(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
}

function isSameUTCDate(dateA, dateB) {
    if (!dateA || !dateB) return false;

    return (
        dateA.getUTCDate() === dateB.getUTCDate() &&
        dateA.getUTCMonth() === dateB.getUTCMonth() &&
        dateA.getUTCFullYear() === dateB.getUTCFullYear()
    );
}

function formatCalendarTitle(viewDate) {
    const month = MONTH_NAMES[viewDate.getUTCMonth()];
    const year = viewDate.getUTCFullYear();
    return `${month} ${year}`;
}

function createDayButton(label, extraClasses = []) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = [
        "btn",
        "btn-sm",
        "btn-ghost",
        "h-10",
        "min-h-0",
        "p-0",
        ...extraClasses,
    ].join(" ");
    return button;
}

function renderCalendar() {
    const year = datePickerState.viewDate.getUTCFullYear();
    const month = datePickerState.viewDate.getUTCMonth();

    calendarTitle.textContent = formatCalendarTitle(datePickerState.viewDate);
    calendarGrid.innerHTML = "";

    const firstDay = getFirstDayOfMonthUTC(year, month);
    const daysInMonth = getDaysInMonthUTC(year, month);

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement("div");
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(Date.UTC(year, month, day));

        const isSelected = isSameUTCDate(
            currentDate,
            datePickerState.selectedDate,
        );

        const button = createDayButton(
            String(day),
            isSelected ? ["btn-primary"] : [],
        );

        button.addEventListener("click", () => {
            selectDate(currentDate);
        });

        calendarGrid.appendChild(button);
    }
}

function selectDate(date) {
    datePickerState.selectedDate = date;
    datePickerState.viewDate = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    );

    inputDate.updateFromDate(date);
    renderCalendar();
    closePopover();
}

function syncCalendarFromInput() {
    if (!inputDate.dateValue) {
        return;
    }

    datePickerState.selectedDate = inputDate.dateValue;
    datePickerState.viewDate = new Date(
        Date.UTC(
            inputDate.dateValue.getUTCFullYear(),
            inputDate.dateValue.getUTCMonth(),
            1,
        ),
    );

    renderCalendar();
}

function goToPreviousMonth() {
    const year = datePickerState.viewDate.getUTCFullYear();
    const month = datePickerState.viewDate.getUTCMonth();

    datePickerState.viewDate = new Date(Date.UTC(year, month - 1, 1));
    renderCalendar();
}

function goToNextMonth() {
    const year = datePickerState.viewDate.getUTCFullYear();
    const month = datePickerState.viewDate.getUTCMonth();

    datePickerState.viewDate = new Date(Date.UTC(year, month + 1, 1));
    renderCalendar();
}

//  ===========================================
//                  LISTENERS
//  ===========================================

function handleInput(event) {
    inputDate.update(event.target.value);
    syncCalendarFromInput();
}

inputDate.inputElement.addEventListener("input", handleInput);

popoverTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePopover();
    renderCalendar();
});

document.addEventListener("click", (event) => {
    const clickedInsidePopover = popoverRoot.contains(event.target);

    if (!clickedInsidePopover) {
        closePopover();
    }
});

window.addEventListener("resize", () => {
    const isOpen = !popoverContent.classList.contains("hidden");

    if (isOpen) {
        resolvePopoverVerticalPosition();
    }
});

prevMonthButton.addEventListener("click", (event) => {
    event.stopPropagation();
    goToPreviousMonth();
});

nextMonthButton.addEventListener("click", (event) => {
    event.stopPropagation();
    goToNextMonth();
});

renderCalendar();
