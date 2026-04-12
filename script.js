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
// INPUT DATE
// ===========================================

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
        this.dateValue = parseDateFromMask(this.displayValue);

        this.inputElement.value = this.displayValue;
    }

    updateFromDate(date) {
        const normalized = normalizeUTCDate(date);
        if (!normalized) return;

        this.dateValue = normalized;
        this.displayValue = formatDateToMask(normalized);
        this.rawValue = filterNumbers(this.displayValue);
        this.inputElement.value = this.displayValue;
    }

    clear() {
        this.rawValue = "";
        this.displayValue = "";
        this.dateValue = null;
        this.inputElement.value = "";
    }
}

// ===========================================
// POPOVER SIMPLES
// ===========================================

function createPopoverController({ rootId, triggerIds, contentId }) {
    const root = document.getElementById(rootId);
    const content = document.getElementById(contentId);
    const triggers = triggerIds.map((id) => document.getElementById(id));

    const POSITION_CLASSES = [
        "top-full",
        "bottom-full",
        "mt-2",
        "mb-2",
        "left-0",
    ];

    function clearPopoverPositionClasses() {
        POSITION_CLASSES.forEach((className) => {
            content.classList.remove(className);
        });
    }

    function applyPopoverBottom() {
        clearPopoverPositionClasses();
        content.classList.add("top-full", "mt-2", "left-0");
    }

    function applyPopoverTop() {
        clearPopoverPositionClasses();
        content.classList.add("bottom-full", "mb-2", "left-0");
    }

    function showForMeasure() {
        content.classList.remove("hidden");
        content.classList.add("invisible");
    }

    function hideMeasureState() {
        content.classList.remove("invisible");
    }

    function resolveVerticalPosition() {
        showForMeasure();
        applyPopoverBottom();

        const triggerRect = root.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
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

    function open() {
        content.classList.remove("hidden");
        resolveVerticalPosition();
    }

    function close() {
        content.classList.add("hidden");
        content.classList.remove("invisible");
    }

    function toggle() {
        const isHidden = content.classList.contains("hidden");

        if (isHidden) {
            open();
            return;
        }

        close();
    }

    triggers.forEach((trigger) => {
        trigger.addEventListener("click", (event) => {
            event.stopPropagation();
            toggle();
        });
    });

    document.addEventListener("click", (event) => {
        if (!root.contains(event.target)) {
            close();
        }
    });

    window.addEventListener("resize", () => {
        const isOpen = !content.classList.contains("hidden");

        if (isOpen) {
            resolveVerticalPosition();
        }
    });

    return {
        root,
        content,
        open,
        close,
        toggle,
        isOpen() {
            return !content.classList.contains("hidden");
        },
    };
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
            extraClasses.push("bg-blue-100", "text-blue-900");
        }

        if (isStart || isEnd) {
            extraClasses.push("bg-blue-600", "text-white", "hover:bg-blue-600");
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

function initSingleDatePicker() {
    const input = new InputDate("single-date");
    const titleElement = document.getElementById("single-title");
    const gridElement = document.getElementById("single-grid");
    const prevButton = document.getElementById("single-prev");
    const nextButton = document.getElementById("single-next");

    const popover = createPopoverController({
        rootId: "single-picker",
        triggerIds: ["single-trigger"],
        contentId: "single-popover",
    });

    const state = {
        selectedDate: null,
        viewDate: normalizeUTCDate(new Date()),
    };

    function render() {
        renderCalendarGrid({
            gridElement,
            titleElement,
            viewDate: state.viewDate,
            selectedDate: state.selectedDate,
            onSelectDate(date) {
                state.selectedDate = normalizeUTCDate(date);
                state.viewDate = new Date(
                    Date.UTC(
                        state.selectedDate.getUTCFullYear(),
                        state.selectedDate.getUTCMonth(),
                        1,
                    ),
                );

                input.updateFromDate(state.selectedDate);
                render();
                popover.close();
            },
        });
    }

    input.inputElement.addEventListener("focus", () => {
        popover.open();
        render();
    });

    input.inputElement.addEventListener("input", (event) => {
        input.update(event.target.value);

        if (input.dateValue) {
            state.selectedDate = normalizeUTCDate(input.dateValue);
            state.viewDate = new Date(
                Date.UTC(
                    state.selectedDate.getUTCFullYear(),
                    state.selectedDate.getUTCMonth(),
                    1,
                ),
            );
            render();
        }
    });

    prevButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const year = state.viewDate.getUTCFullYear();
        const month = state.viewDate.getUTCMonth();
        state.viewDate = new Date(Date.UTC(year, month - 1, 1));
        render();
    });

    nextButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const year = state.viewDate.getUTCFullYear();
        const month = state.viewDate.getUTCMonth();
        state.viewDate = new Date(Date.UTC(year, month + 1, 1));
        render();
    });

    render();
}

// ===========================================
// RANGE DATEPICKER
// ===========================================

function initRangeDatePicker() {
    const startInput = new InputDate("range-start");
    const endInput = new InputDate("range-end");

    const titleElement = document.getElementById("range-title");
    const gridElement = document.getElementById("range-grid");
    const prevButton = document.getElementById("range-prev");
    const nextButton = document.getElementById("range-next");

    const popover = createPopoverController({
        rootId: "range-picker",
        triggerIds: [],
        contentId: "range-popover",
    });

    const state = {
        startDate: null,
        endDate: null,
        activeField: "start",
        viewDate: normalizeUTCDate(new Date()),
    };

    function normalizeRangeOrder() {
        if (!state.startDate || !state.endDate) return;

        const startTime = state.startDate.getTime();
        const endTime = state.endDate.getTime();

        if (endTime < startTime) {
            const temp = state.startDate;
            state.startDate = state.endDate;
            state.endDate = temp;

            startInput.updateFromDate(state.startDate);
            endInput.updateFromDate(state.endDate);
        }
    }

    function render() {
        renderCalendarGrid({
            gridElement,
            titleElement,
            viewDate: state.viewDate,
            rangeStart: state.startDate,
            rangeEnd: state.endDate,
            selectedDate:
                state.activeField === "start" ? state.startDate : state.endDate,
            onSelectDate(date) {
                const normalized = normalizeUTCDate(date);

                if (state.activeField === "start") {
                    state.startDate = normalized;
                    startInput.updateFromDate(normalized);

                    state.activeField = "end";
                    render();
                    return;
                }

                state.endDate = normalized;
                endInput.updateFromDate(normalized);

                normalizeRangeOrder();
                render();
                popover.close();
            },
        });
    }

    function syncViewFromDate(date) {
        if (!date) return;

        state.viewDate = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
        );
    }

    startInput.inputElement.addEventListener("focus", () => {
        state.activeField = "start";
        syncViewFromDate(state.startDate || normalizeUTCDate(new Date()));
        popover.open();
        render();
    });

    endInput.inputElement.addEventListener("focus", () => {
        state.activeField = "end";
        syncViewFromDate(
            state.endDate || state.startDate || normalizeUTCDate(new Date()),
        );
        popover.open();
        render();
    });

    startInput.inputElement.addEventListener("input", (event) => {
        startInput.update(event.target.value);

        state.startDate = startInput.dateValue
            ? normalizeUTCDate(startInput.dateValue)
            : null;
        syncViewFromDate(
            state.startDate || state.endDate || normalizeUTCDate(new Date()),
        );
        normalizeRangeOrder();
        render();
    });

    endInput.inputElement.addEventListener("input", (event) => {
        endInput.update(event.target.value);

        state.endDate = endInput.dateValue
            ? normalizeUTCDate(endInput.dateValue)
            : null;
        syncViewFromDate(
            state.endDate || state.startDate || normalizeUTCDate(new Date()),
        );
        normalizeRangeOrder();
        render();
    });

    prevButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const year = state.viewDate.getUTCFullYear();
        const month = state.viewDate.getUTCMonth();
        state.viewDate = new Date(Date.UTC(year, month - 1, 1));
        render();
    });

    nextButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const year = state.viewDate.getUTCFullYear();
        const month = state.viewDate.getUTCMonth();
        state.viewDate = new Date(Date.UTC(year, month + 1, 1));
        render();
    });

    render();
}

// ===========================================
// BOOT
// ===========================================

initSingleDatePicker();
initRangeDatePicker();
