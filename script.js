"use strict";
// ============================================================================
// Shared constants and types
// ============================================================================
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
// ============================================================================
// DOM helpers
// ============================================================================
function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLElement)) {
        throw new Error(`Element with id "${id}" was not found.`);
    }
    return element;
}
// ============================================================================
// Input mask and date parsing helpers
// ============================================================================
function filterNumbers(value) {
    return value.replace(/\D/g, "");
}
function limitDateDigits(value) {
    return value.slice(0, 8);
}
function dateMaskABNT(value) {
    const digits = limitDateDigits(filterNumbers(value));
    if (digits.length <= 2)
        return digits;
    if (digits.length < 5)
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}
function parseDateFromMask(maskValue) {
    const parts = maskValue.split("/");
    if (parts.length !== 3)
        return null;
    const day = Number.parseInt(parts[0], 10);
    const month = Number.parseInt(parts[1], 10) - 1;
    const year = Number.parseInt(parts[2], 10);
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
        return null;
    }
    if (year < 1000)
        return null;
    const date = new Date(year, month, day);
    const isValid = date.getDate() === day &&
        date.getMonth() === month &&
        date.getFullYear() === year;
    return isValid ? date : null;
}
function formatDateToMask(date) {
    if (!(date instanceof Date))
        return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
}
// ============================================================================
//  date helpers
// ============================================================================
function normalizeDate(date) {
    if (!(date instanceof Date))
        return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function isSameDate(dateA, dateB) {
    if (!dateA || !dateB)
        return false;
    return (dateA.getDate() === dateB.getDate() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getFullYear() === dateB.getFullYear());
}
function isDateBetween(date, start, end) {
    var _a, _b, _c;
    if (!date || !start || !end)
        return false;
    const current = (_a = normalizeDate(date)) === null || _a === void 0 ? void 0 : _a.getTime();
    const startTime = (_b = normalizeDate(start)) === null || _b === void 0 ? void 0 : _b.getTime();
    const endTime = (_c = normalizeDate(end)) === null || _c === void 0 ? void 0 : _c.getTime();
    if (current === undefined ||
        startTime === undefined ||
        endTime === undefined) {
        return false;
    }
    return current > startTime && current < endTime;
}
function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}
function getFirstDayOfMonth(year, monthIndex) {
    return new Date(year, monthIndex, 1).getDay();
}
function formatCalendarTitle(viewDate) {
    return `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
}
// ============================================================================
// Component 1: input state wrapper
// Keeps the raw digits, masked value, parsed date and DOM input in sync.
// ============================================================================
class InputDateBase {
    constructor(id, label = id) {
        this.rawValue = "";
        this.displayValue = "";
        this.dateValue = null;
        this.inputElement = getRequiredElement(id);
        this.label = label;
    }
    update(value) {
        this.rawValue = limitDateDigits(filterNumbers(value));
        this.displayValue = dateMaskABNT(this.rawValue);
        this.dateValue = parseDateFromMask(this.displayValue);
        this.inputElement.value = this.displayValue;
        if (this.dateValue) {
            console.log(`[${this.label}] valid date:`, {
                inputElement: this.inputElement,
                label: this.label,
                rawValue: this.rawValue,
                displayValue: this.displayValue,
                dateValue: this.dateValue,
                _iso: this.dateValue.toISOString(),
                _timestamp: this.dateValue.getTime(),
            });
            return;
        }
        console.log(`[${this.label}] invalid or incomplete date, clearing current date`);
    }
    updateFromDate(date) {
        const normalized = normalizeDate(date);
        if (!normalized)
            return;
        this.dateValue = normalized;
        this.displayValue = formatDateToMask(normalized);
        this.rawValue = filterNumbers(this.displayValue);
        this.inputElement.value = this.displayValue;
        console.log(`[${this.label}] valid date from calendar:`, {
            inputElement: this.inputElement,
            label: this.label,
            rawValue: this.rawValue,
            displayValue: this.displayValue,
            dateValue: this.dateValue,
            _iso: this.dateValue.toISOString(),
            _timestamp: this.dateValue.getTime(),
        });
    }
    clear() {
        this.rawValue = "";
        this.displayValue = "";
        this.dateValue = null;
        this.inputElement.value = "";
    }
    getValidDateOrNull() {
        return this.dateValue ? normalizeDate(this.dateValue) : null;
    }
}
// ============================================================================
// Component 2: popover controller
// Opens/closes the floating calendar and decides whether it should render
// above or below the field depending on viewport space.
// ============================================================================
class PopoverController {
    constructor({ rootId, triggerIds, contentId }) {
        this.positionClasses = [
            "top-full",
            "bottom-full",
            "mt-2",
            "mb-2",
            "left-0",
        ];
        this.root = getRequiredElement(rootId);
        this.content = getRequiredElement(contentId);
        this.triggers = triggerIds
            .map((id) => document.getElementById(id))
            .filter((element) => {
            return element instanceof HTMLButtonElement;
        });
        this.bindEvents();
    }
    open() {
        this.content.classList.remove("hidden");
        this.resolveVerticalPosition();
    }
    close() {
        this.content.classList.add("hidden");
        this.content.classList.remove("invisible");
    }
    toggle() {
        if (this.isOpen()) {
            this.close();
            return;
        }
        this.open();
    }
    isOpen() {
        return !this.content.classList.contains("hidden");
    }
    clearPositionClasses() {
        this.positionClasses.forEach((className) => {
            this.content.classList.remove(className);
        });
    }
    applyBottom() {
        this.clearPositionClasses();
        this.content.classList.add("top-full", "mt-2", "left-0");
    }
    applyTop() {
        this.clearPositionClasses();
        this.content.classList.add("bottom-full", "mb-2", "left-0");
    }
    showForMeasure() {
        this.content.classList.remove("hidden");
        this.content.classList.add("invisible");
    }
    unhideMeasureState() {
        this.content.classList.remove("invisible");
    }
    resolveVerticalPosition() {
        this.showForMeasure();
        this.applyBottom();
        const triggerRect = this.root.getBoundingClientRect();
        const contentRect = this.content.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const fitsBelow = spaceBelow >= contentRect.height + 8;
        const fitsAbove = spaceAbove >= contentRect.height + 8;
        if (fitsBelow || !fitsAbove) {
            this.applyBottom();
        }
        else {
            this.applyTop();
        }
        this.unhideMeasureState();
    }
    bindEvents() {
        this.triggers.forEach((trigger) => {
            trigger.addEventListener("click", (event) => {
                event.stopPropagation();
                this.toggle();
            });
        });
        document.addEventListener("click", (event) => {
            if (!(event.target instanceof Node))
                return;
            if (!this.root.contains(event.target)) {
                this.close();
            }
        });
        window.addEventListener("resize", () => {
            if (this.isOpen()) {
                this.resolveVerticalPosition();
            }
        });
    }
}
// ============================================================================
// Component 3: shared calendar rendering
// Renders one month grid and lets each picker decide what to do on selection.
// ============================================================================
function createDayButton(label, extraClasses = []) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = [
        "h-10",
        "rounded-md",
        "text-sm",
        "transition",
        "border",
        "border-transparent",
        "hover:bg-zinc-100",
        ...extraClasses,
    ].join(" ");
    return button;
}
function renderCalendarGrid({ gridElement, titleElement, viewDate, selectedDate = null, rangeStart = null, rangeEnd = null, onSelectDate, }) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    titleElement.textContent = formatCalendarTitle(viewDate);
    gridElement.innerHTML = "";
    const offset = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const daysInLastMonth = getDaysInMonth(year, month - 1);
    let numDatesOnGrid = 0;
    // Items about last month
    for (let index = 0; index < offset; index += 1) {
        // const emptyCell = document.createElement("div");
        // gridElement.appendChild(emptyCell);
        numDatesOnGrid++;
        const day = daysInLastMonth + (index + 1) - offset;
        const currentDate = new Date(year, month - 1, day);
        const isSelected = isSameDate(currentDate, selectedDate);
        const isStart = isSameDate(currentDate, rangeStart);
        const isEnd = isSameDate(currentDate, rangeEnd);
        const isBetween = isDateBetween(currentDate, rangeStart, rangeEnd);
        const extraClasses = ["text-slate-500"];
        if (isBetween) {
            extraClasses.push("bg-orange-100", "text-orange-900");
        }
        if (isStart || isEnd) {
            extraClasses.push("bg-orange-600", "text-white", "hover:bg-orange-600");
        }
        if (isSelected && !isStart && !isEnd) {
            extraClasses.push("ring-2", "ring-zinc-900");
        }
        const button = createDayButton(String(day), extraClasses);
        button.addEventListener("click", () => {
            onSelectDate(currentDate);
        });
        gridElement.appendChild(button);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        numDatesOnGrid++;
        const currentDate = new Date(year, month, day);
        const isSelected = isSameDate(currentDate, selectedDate);
        const isStart = isSameDate(currentDate, rangeStart);
        const isEnd = isSameDate(currentDate, rangeEnd);
        const isBetween = isDateBetween(currentDate, rangeStart, rangeEnd);
        const extraClasses = [];
        if (isBetween) {
            extraClasses.push("bg-orange-100", "text-orange-900");
        }
        if (isStart || isEnd) {
            extraClasses.push("bg-orange-600", "text-white", "hover:bg-orange-600");
        }
        if (isSelected && !isStart && !isEnd) {
            extraClasses.push("ring-2", "ring-zinc-900");
        }
        const button = createDayButton(String(day), extraClasses);
        button.addEventListener("click", () => {
            onSelectDate(currentDate);
        });
        gridElement.appendChild(button);
    }
    let day = 0;
    while (numDatesOnGrid < 42) {
        numDatesOnGrid++;
        day++;
        const currentDate = new Date(year, month + 1, day);
        const isSelected = isSameDate(currentDate, selectedDate);
        const isStart = isSameDate(currentDate, rangeStart);
        const isEnd = isSameDate(currentDate, rangeEnd);
        const isBetween = isDateBetween(currentDate, rangeStart, rangeEnd);
        const extraClasses = ["text-slate-500"];
        if (isBetween) {
            extraClasses.push("bg-orange-100", "text-orange-900");
        }
        if (isStart || isEnd) {
            extraClasses.push("bg-orange-600", "text-white", "hover:bg-orange-600");
        }
        if (isSelected && !isStart && !isEnd) {
            extraClasses.push("ring-2", "ring-zinc-900");
        }
        const button = createDayButton(String(day), extraClasses);
        button.addEventListener("click", () => {
            onSelectDate(currentDate);
        });
        gridElement.appendChild(button);
    }
}
// ============================================================================
// Single datepicker controller
// Wires one input to one calendar popover.
// ============================================================================
class SingleDatePicker {
    constructor() {
        var _a;
        this.input = new InputDateBase("single-date", "single-date");
        this.titleElement = getRequiredElement("single-title");
        this.gridElement = getRequiredElement("single-grid");
        this.prevButton = getRequiredElement("single-prev");
        this.nextButton = getRequiredElement("single-next");
        this.popover = new PopoverController({
            rootId: "single-picker",
            triggerIds: ["single-trigger"],
            contentId: "single-popover",
        });
        this.state = {
            selectedDate: null,
            viewDate: (_a = normalizeDate(new Date())) !== null && _a !== void 0 ? _a : new Date(),
        };
        this.bindEvents();
        this.render();
    }
    render() {
        renderCalendarGrid({
            gridElement: this.gridElement,
            titleElement: this.titleElement,
            viewDate: this.state.viewDate,
            selectedDate: this.state.selectedDate,
            onSelectDate: (date) => {
                const normalized = normalizeDate(date);
                if (!normalized)
                    return;
                this.state.selectedDate = normalized;
                this.syncViewFromDate(normalized);
                this.input.updateFromDate(normalized);
                this.render();
                this.popover.close();
            },
        });
    }
    bindEvents() {
        this.input.inputElement.addEventListener("focus", () => {
            this.popover.open();
            this.render();
        });
        this.input.inputElement.addEventListener("input", (event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement))
                return;
            this.input.update(target.value);
            const validDate = this.input.getValidDateOrNull();
            if (validDate) {
                this.state.selectedDate = validDate;
                this.syncViewFromDate(validDate);
            }
            else {
                this.state.selectedDate = null;
            }
            this.render();
        });
        this.prevButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const year = this.state.viewDate.getFullYear();
            const month = this.state.viewDate.getMonth();
            this.state.viewDate = new Date(year, month - 1, 1);
            this.render();
        });
        this.nextButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const year = this.state.viewDate.getFullYear();
            const month = this.state.viewDate.getMonth();
            this.state.viewDate = new Date(year, month + 1, 1);
            this.render();
        });
    }
    syncViewFromDate(date) {
        if (!date)
            return;
        this.state.viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }
}
// ============================================================================
// Range datepicker controller
// Wires two inputs to one shared calendar and keeps the range ordered.
// ============================================================================
class RangeDatePicker {
    constructor() {
        var _a;
        this.startInput = new InputDateBase("range-start", "range-start");
        this.endInput = new InputDateBase("range-end", "range-end");
        this.titleElement = getRequiredElement("range-title");
        this.gridElement = getRequiredElement("range-grid");
        this.prevButton = getRequiredElement("range-prev");
        this.nextButton = getRequiredElement("range-next");
        this.popover = new PopoverController({
            rootId: "range-picker",
            triggerIds: [],
            contentId: "range-popover",
        });
        this.state = {
            startDate: null,
            endDate: null,
            activeField: "start",
            viewDate: (_a = normalizeDate(new Date())) !== null && _a !== void 0 ? _a : new Date(),
        };
        this.bindEvents();
        this.render();
    }
    render() {
        renderCalendarGrid({
            gridElement: this.gridElement,
            titleElement: this.titleElement,
            viewDate: this.state.viewDate,
            rangeStart: this.state.startDate,
            rangeEnd: this.state.endDate,
            selectedDate: this.state.activeField === "start"
                ? this.state.startDate
                : this.state.endDate,
            onSelectDate: (date) => {
                var _a;
                const normalized = normalizeDate(date);
                if (!normalized)
                    return;
                if (this.state.activeField === "start") {
                    this.state.startDate = normalized;
                    this.startInput.updateFromDate(normalized);
                    this.state.activeField = "end";
                    this.syncViewFromDate(normalized);
                    this.render();
                    return;
                }
                this.state.endDate = normalized;
                this.endInput.updateFromDate(normalized);
                this.normalizeRangeOrder();
                this.syncViewFromDate((_a = this.state.endDate) !== null && _a !== void 0 ? _a : this.state.startDate);
                this.render();
                this.popover.close();
            },
        });
    }
    bindEvents() {
        this.startInput.inputElement.addEventListener("focus", () => {
            var _a;
            this.state.activeField = "start";
            this.syncViewFromDate((_a = this.state.startDate) !== null && _a !== void 0 ? _a : normalizeDate(new Date()));
            this.popover.open();
            this.render();
        });
        this.endInput.inputElement.addEventListener("focus", () => {
            var _a, _b;
            this.state.activeField = "end";
            this.syncViewFromDate((_b = (_a = this.state.endDate) !== null && _a !== void 0 ? _a : this.state.startDate) !== null && _b !== void 0 ? _b : normalizeDate(new Date()));
            this.popover.open();
            this.render();
        });
        this.startInput.inputElement.addEventListener("input", (event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement))
                return;
            this.startInput.update(target.value);
            const validDate = this.startInput.getValidDateOrNull();
            if (validDate) {
                this.state.startDate = validDate;
                this.syncViewFromDate(validDate);
            }
            else {
                this.state.startDate = null;
            }
            this.normalizeRangeOrder();
            this.render();
        });
        this.endInput.inputElement.addEventListener("input", (event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement))
                return;
            this.endInput.update(target.value);
            const validDate = this.endInput.getValidDateOrNull();
            if (validDate) {
                this.state.endDate = validDate;
                this.syncViewFromDate(validDate);
            }
            else {
                this.state.endDate = null;
            }
            this.normalizeRangeOrder();
            this.render();
        });
        this.prevButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const year = this.state.viewDate.getFullYear();
            const month = this.state.viewDate.getMonth();
            this.state.viewDate = new Date(year, month - 1, 1);
            this.render();
        });
        this.nextButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const year = this.state.viewDate.getFullYear();
            const month = this.state.viewDate.getMonth();
            this.state.viewDate = new Date(year, month + 1, 1);
            this.render();
        });
    }
    syncViewFromDate(date) {
        if (!date)
            return;
        this.state.viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    normalizeRangeOrder() {
        if (!this.state.startDate || !this.state.endDate)
            return;
        const startTime = this.state.startDate.getTime();
        const endTime = this.state.endDate.getTime();
        if (endTime < startTime) {
            const temporaryDate = this.state.startDate;
            this.state.startDate = this.state.endDate;
            this.state.endDate = temporaryDate;
            this.startInput.updateFromDate(this.state.startDate);
            this.endInput.updateFromDate(this.state.endDate);
        }
    }
}
// ============================================================================
// Page bootstrap
// ============================================================================
new SingleDatePicker();
new RangeDatePicker();
