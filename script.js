// ===========================================
// HELPERS DE DATA
// ===========================================

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

function filterNumbers(value) {
    return value.replace(/\D/g, "");
}

function limitDateDigits(value) {
    return value.slice(0, 8);
}

function dateMaskABNT(value) {
    const digits = limitDateDigits(filterNumbers(value));

    if (digits.length <= 2) return digits;
    if (digits.length < 5) return digits.slice(0, 2) + "/" + digits.slice(2);

    return (
        digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8)
    );
}

function parseDateFromMask(maskValue) {
    const parts = maskValue.split("/");

    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
        return null;
    }

    if (year < 1000) return null;

    const date = new Date(Date.UTC(year, month, day));

    const isValid =
        date.getUTCDate() === day &&
        date.getUTCMonth() === month &&
        date.getUTCFullYear() === year;

    return isValid ? date : null;
}

function formatDateToMask(date) {
    if (!(date instanceof Date)) return "";

    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = String(date.getUTCFullYear());

    return `${day}/${month}/${year}`;
}

function normalizeUTCDate(date) {
    if (!(date instanceof Date)) return null;

    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

function isSameUTCDate(dateA, dateB) {
    if (!dateA || !dateB) return false;

    return (
        dateA.getUTCDate() === dateB.getUTCDate() &&
        dateA.getUTCMonth() === dateB.getUTCMonth() &&
        dateA.getUTCFullYear() === dateB.getUTCFullYear()
    );
}

function isDateBetweenUTC(date, start, end) {
    if (!date || !start || !end) return false;

    const current = normalizeUTCDate(date).getTime();
    const startTime = normalizeUTCDate(start).getTime();
    const endTime = normalizeUTCDate(end).getTime();

    return current > startTime && current < endTime;
}

function getDaysInMonthUTC(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getFirstDayOfMonthUTC(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
}

function formatCalendarTitle(viewDate) {
    return `${MONTH_NAMES[viewDate.getUTCMonth()]} ${viewDate.getUTCFullYear()}`;
}

// ===========================================
// INPUT DATE BASE
// ===========================================

class InputDateBase {
    constructor(id, label = id) {
        this.inputElement = document.getElementById(id);
        this.label = label;
        this.rawValue = "";
        this.displayValue = "";
        this.dateValue = null;
    }

    update(value) {
        this.rawValue = limitDateDigits(filterNumbers(value));
        this.displayValue = dateMaskABNT(this.rawValue);
        this.dateValue = parseDateFromMask(this.displayValue);

        this.inputElement.value = this.displayValue;

        if (this.dateValue) {
            console.log(`[${this.label}] valid date:`, {
                mask: this.displayValue,
                iso: this.dateValue.toISOString(),
                timestamp: this.dateValue.getTime(),
            });
        } else {
            console.log(
                `[${this.label}] invalid or incomplete date, clearing current date`,
            );
        }
    }

    updateFromDate(date) {
        const normalized = normalizeUTCDate(date);
        if (!normalized) return;

        this.dateValue = normalized;
        this.displayValue = formatDateToMask(normalized);
        this.rawValue = filterNumbers(this.displayValue);
        this.inputElement.value = this.displayValue;

        console.log(`[${this.label}] valid date from calendar:`, {
            mask: this.displayValue,
            iso: this.dateValue.toISOString(),
            timestamp: this.dateValue.getTime(),
        });
    }

    clear() {
        this.rawValue = "";
        this.displayValue = "";
        this.dateValue = null;
        this.inputElement.value = "";
    }

    getValidDateOrNull() {
        return this.dateValue ? normalizeUTCDate(this.dateValue) : null;
    }
}

// ===========================================
// POPOVER
// ===========================================

class PopoverController {
    constructor({ rootId, triggerIds, contentId }) {
        this.root = document.getElementById(rootId);
        this.content = document.getElementById(contentId);
        this.triggers = triggerIds.map((id) => document.getElementById(id));
        this.positionClasses = [
            "top-full",
            "bottom-full",
            "mt-2",
            "mb-2",
            "left-0",
        ];

        this.bindEvents();
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

    hideMeasureState() {
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
        } else {
            this.applyTop();
        }

        this.hideMeasureState();
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

    bindEvents() {
        this.triggers.forEach((trigger) => {
            if (!trigger) return;

            trigger.addEventListener("click", (event) => {
                event.stopPropagation();
                this.toggle();
            });
        });

        document.addEventListener("click", (event) => {
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

// ===========================================
// RENDER DO CALENDÁRIO
// ===========================================

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

function renderCalendarGrid({
    gridElement,
    titleElement,
    viewDate,
    selectedDate = null,
    rangeStart = null,
    rangeEnd = null,
    onSelectDate,
}) {
    const year = viewDate.getUTCFullYear();
    const month = viewDate.getUTCMonth();

    titleElement.textContent = formatCalendarTitle(viewDate);
    gridElement.innerHTML = "";

    const firstDay = getFirstDayOfMonthUTC(year, month);
    const daysInMonth = getDaysInMonthUTC(year, month);

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement("div");
        gridElement.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(Date.UTC(year, month, day));

        const isSelected = isSameUTCDate(currentDate, selectedDate);
        const isStart = isSameUTCDate(currentDate, rangeStart);
        const isEnd = isSameUTCDate(currentDate, rangeEnd);
        const isBetween = isDateBetweenUTC(currentDate, rangeStart, rangeEnd);

        const extraClasses = [];

        if (isBetween) {
            extraClasses.push("bg-orange-100", "text-orange-900");
        }

        if (isStart || isEnd) {
            extraClasses.push(
                "bg-orange-600",
                "text-white",
                "hover:bg-orange-600",
            );
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

// ===========================================
// SINGLE DATEPICKER
// ===========================================

class SingleDatePicker {
    constructor() {
        this.input = new InputDateBase("single-date", "single-date");
        this.titleElement = document.getElementById("single-title");
        this.gridElement = document.getElementById("single-grid");
        this.prevButton = document.getElementById("single-prev");
        this.nextButton = document.getElementById("single-next");

        this.popover = new PopoverController({
            rootId: "single-picker",
            triggerIds: ["single-trigger"],
            contentId: "single-popover",
        });

        this.state = {
            selectedDate: null,
            viewDate: normalizeUTCDate(new Date()),
        };

        this.bindEvents();
        this.render();
    }

    syncViewFromDate(date) {
        if (!date) return;

        this.state.viewDate = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
        );
    }

    render() {
        renderCalendarGrid({
            gridElement: this.gridElement,
            titleElement: this.titleElement,
            viewDate: this.state.viewDate,
            selectedDate: this.state.selectedDate,
            onSelectDate: (date) => {
                const normalized = normalizeUTCDate(date);

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
            this.input.update(event.target.value);

            const validDate = this.input.getValidDateOrNull();

            if (validDate) {
                this.state.selectedDate = validDate;
                this.syncViewFromDate(validDate);
            } else {
                this.state.selectedDate = null;
            }

            this.render();
        });

        this.prevButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month - 1, 1));
            this.render();
        });

        this.nextButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month + 1, 1));
            this.render();
        });
    }
}

// ===========================================
// RANGE DATEPICKER
// ===========================================

class RangeDatePicker {
    constructor() {
        this.startInput = new InputDateBase("range-start", "range-start");
        this.endInput = new InputDateBase("range-end", "range-end");

        this.titleElement = document.getElementById("range-title");
        this.gridElement = document.getElementById("range-grid");
        this.prevButton = document.getElementById("range-prev");
        this.nextButton = document.getElementById("range-next");

        this.popover = new PopoverController({
            rootId: "range-picker",
            triggerIds: [],
            contentId: "range-popover",
        });

        this.state = {
            startDate: null,
            endDate: null,
            activeField: "start",
            viewDate: normalizeUTCDate(new Date()),
        };

        this.bindEvents();
        this.render();
    }

    syncViewFromDate(date) {
        if (!date) return;

        this.state.viewDate = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
        );
    }

    normalizeRangeOrder() {
        if (!this.state.startDate || !this.state.endDate) return;

        const startTime = this.state.startDate.getTime();
        const endTime = this.state.endDate.getTime();

        if (endTime < startTime) {
            const temp = this.state.startDate;
            this.state.startDate = this.state.endDate;
            this.state.endDate = temp;

            this.startInput.updateFromDate(this.state.startDate);
            this.endInput.updateFromDate(this.state.endDate);
        }
    }

    render() {
        renderCalendarGrid({
            gridElement: this.gridElement,
            titleElement: this.titleElement,
            viewDate: this.state.viewDate,
            rangeStart: this.state.startDate,
            rangeEnd: this.state.endDate,
            selectedDate:
                this.state.activeField === "start"
                    ? this.state.startDate
                    : this.state.endDate,
            onSelectDate: (date) => {
                const normalized = normalizeUTCDate(date);

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
                this.syncViewFromDate(
                    this.state.endDate || this.state.startDate,
                );
                this.render();
                this.popover.close();
            },
        });
    }

    bindEvents() {
        this.startInput.inputElement.addEventListener("focus", () => {
            this.state.activeField = "start";
            this.syncViewFromDate(
                this.state.startDate || normalizeUTCDate(new Date()),
            );
            this.popover.open();
            this.render();
        });

        this.endInput.inputElement.addEventListener("focus", () => {
            this.state.activeField = "end";
            this.syncViewFromDate(
                this.state.endDate ||
                    this.state.startDate ||
                    normalizeUTCDate(new Date()),
            );
            this.popover.open();
            this.render();
        });

        this.startInput.inputElement.addEventListener("input", (event) => {
            this.startInput.update(event.target.value);

            const validDate = this.startInput.getValidDateOrNull();

            if (validDate) {
                this.state.startDate = validDate;
                this.syncViewFromDate(validDate);
            } else {
                this.state.startDate = null;
            }

            this.normalizeRangeOrder();
            this.render();
        });

        this.endInput.inputElement.addEventListener("input", (event) => {
            this.endInput.update(event.target.value);

            const validDate = this.endInput.getValidDateOrNull();

            if (validDate) {
                this.state.endDate = validDate;
                this.syncViewFromDate(validDate);
            } else {
                this.state.endDate = null;
            }

            this.normalizeRangeOrder();
            this.render();
        });

        this.prevButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month - 1, 1));
            this.render();
        });

        this.nextButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month + 1, 1));
            this.render();
        });
    }
}

// ===========================================
// BOOT
// ===========================================

new SingleDatePicker();
new RangeDatePicker();
