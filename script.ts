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
] as const;

type NullableDate = Date | null;
type RangeField = "start" | "end";

interface RenderCalendarGridOptions {
    gridElement: HTMLElement;
    titleElement: HTMLElement;
    viewDate: Date;
    selectedDate?: NullableDate;
    rangeStart?: NullableDate;
    rangeEnd?: NullableDate;
    onSelectDate: (date: Date) => void;
}

interface PopoverControllerOptions {
    rootId: string;
    triggerIds: string[];
    contentId: string;
}

interface SingleDatePickerState {
    selectedDate: NullableDate;
    viewDate: Date;
}

interface RangeDatePickerState {
    startDate: NullableDate;
    endDate: NullableDate;
    activeField: RangeField;
    viewDate: Date;
}

function getRequiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);

    if (!(element instanceof HTMLElement)) {
        throw new Error(`Element with id "${id}" was not found.`);
    }

    return element as T;
}

function filterNumbers(value: string): string {
    return value.replace(/\D/g, "");
}

function limitDateDigits(value: string): string {
    return value.slice(0, 8);
}

function dateMaskABNT(value: string): string {
    const digits = limitDateDigits(filterNumbers(value));

    if (digits.length <= 2) return digits;
    if (digits.length < 5) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function parseDateFromMask(maskValue: string): NullableDate {
    const parts = maskValue.split("/");

    if (parts.length !== 3) return null;

    const day = Number.parseInt(parts[0], 10);
    const month = Number.parseInt(parts[1], 10) - 1;
    const year = Number.parseInt(parts[2], 10);

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

function formatDateToMask(date: Date): string {
    if (!(date instanceof Date)) return "";

    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = String(date.getUTCFullYear());

    return `${day}/${month}/${year}`;
}

function normalizeUTCDate(date: NullableDate): NullableDate {
    if (!(date instanceof Date)) return null;

    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

function isSameUTCDate(dateA: NullableDate, dateB: NullableDate): boolean {
    if (!dateA || !dateB) return false;

    return (
        dateA.getUTCDate() === dateB.getUTCDate() &&
        dateA.getUTCMonth() === dateB.getUTCMonth() &&
        dateA.getUTCFullYear() === dateB.getUTCFullYear()
    );
}

function isDateBetweenUTC(
    date: NullableDate,
    start: NullableDate,
    end: NullableDate,
): boolean {
    if (!date || !start || !end) return false;

    const current = normalizeUTCDate(date)?.getTime();
    const startTime = normalizeUTCDate(start)?.getTime();
    const endTime = normalizeUTCDate(end)?.getTime();

    if (
        current === undefined ||
        startTime === undefined ||
        endTime === undefined
    ) {
        return false;
    }

    return current > startTime && current < endTime;
}

function getDaysInMonthUTC(year: number, monthIndex: number): number {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getFirstDayOfMonthUTC(year: number, monthIndex: number): number {
    return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
}

function formatCalendarTitle(viewDate: Date): string {
    return `${MONTH_NAMES[viewDate.getUTCMonth()]} ${viewDate.getUTCFullYear()}`;
}

class InputDateBase {
    public readonly inputElement: HTMLInputElement;
    public readonly label: string;
    public rawValue = "";
    public displayValue = "";
    public dateValue: NullableDate = null;

    constructor(id: string, label = id) {
        this.inputElement = getRequiredElement<HTMLInputElement>(id);
        this.label = label;
    }

    update(value: string): void {
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
            return;
        }

        console.log(
            `[${this.label}] invalid or incomplete date, clearing current date`,
        );
    }

    updateFromDate(date: Date): void {
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

    clear(): void {
        this.rawValue = "";
        this.displayValue = "";
        this.dateValue = null;
        this.inputElement.value = "";
    }

    getValidDateOrNull(): NullableDate {
        return this.dateValue ? normalizeUTCDate(this.dateValue) : null;
    }
}

class PopoverController {
    private readonly root: HTMLElement;
    private readonly content: HTMLElement;
    private readonly triggers: HTMLButtonElement[];
    private readonly positionClasses = [
        "top-full",
        "bottom-full",
        "mt-2",
        "mb-2",
        "left-0",
    ];

    constructor({ rootId, triggerIds, contentId }: PopoverControllerOptions) {
        this.root = getRequiredElement(rootId);
        this.content = getRequiredElement(contentId);
        this.triggers = triggerIds
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLButtonElement => {
                return element instanceof HTMLButtonElement;
            });

        this.bindEvents();
    }

    clearPositionClasses(): void {
        this.positionClasses.forEach((className) => {
            this.content.classList.remove(className);
        });
    }

    applyBottom(): void {
        this.clearPositionClasses();
        this.content.classList.add("top-full", "mt-2", "left-0");
    }

    applyTop(): void {
        this.clearPositionClasses();
        this.content.classList.add("bottom-full", "mb-2", "left-0");
    }

    showForMeasure(): void {
        this.content.classList.remove("hidden");
        this.content.classList.add("invisible");
    }

    hideMeasureState(): void {
        this.content.classList.remove("invisible");
    }

    resolveVerticalPosition(): void {
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

    open(): void {
        this.content.classList.remove("hidden");
        this.resolveVerticalPosition();
    }

    close(): void {
        this.content.classList.add("hidden");
        this.content.classList.remove("invisible");
    }

    toggle(): void {
        if (this.isOpen()) {
            this.close();
            return;
        }

        this.open();
    }

    isOpen(): boolean {
        return !this.content.classList.contains("hidden");
    }

    private bindEvents(): void {
        this.triggers.forEach((trigger) => {
            trigger.addEventListener("click", (event: MouseEvent) => {
                event.stopPropagation();
                this.toggle();
            });
        });

        document.addEventListener("click", (event: MouseEvent) => {
            if (!(event.target instanceof Node)) return;

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

function createDayButton(
    label: string,
    extraClasses: string[] = [],
): HTMLButtonElement {
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
}: RenderCalendarGridOptions): void {
    const year = viewDate.getUTCFullYear();
    const month = viewDate.getUTCMonth();

    titleElement.textContent = formatCalendarTitle(viewDate);
    gridElement.innerHTML = "";

    const firstDay = getFirstDayOfMonthUTC(year, month);
    const daysInMonth = getDaysInMonthUTC(year, month);

    for (let index = 0; index < firstDay; index += 1) {
        const emptyCell = document.createElement("div");
        gridElement.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const currentDate = new Date(Date.UTC(year, month, day));

        const isSelected = isSameUTCDate(currentDate, selectedDate);
        const isStart = isSameUTCDate(currentDate, rangeStart);
        const isEnd = isSameUTCDate(currentDate, rangeEnd);
        const isBetween = isDateBetweenUTC(currentDate, rangeStart, rangeEnd);

        const extraClasses: string[] = [];

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

class SingleDatePicker {
    private readonly input: InputDateBase;
    private readonly titleElement: HTMLElement;
    private readonly gridElement: HTMLElement;
    private readonly prevButton: HTMLButtonElement;
    private readonly nextButton: HTMLButtonElement;
    private readonly popover: PopoverController;
    private readonly state: SingleDatePickerState;

    constructor() {
        this.input = new InputDateBase("single-date", "single-date");
        this.titleElement = getRequiredElement("single-title");
        this.gridElement = getRequiredElement("single-grid");
        this.prevButton = getRequiredElement<HTMLButtonElement>("single-prev");
        this.nextButton = getRequiredElement<HTMLButtonElement>("single-next");

        this.popover = new PopoverController({
            rootId: "single-picker",
            triggerIds: ["single-trigger"],
            contentId: "single-popover",
        });

        this.state = {
            selectedDate: null,
            viewDate: normalizeUTCDate(new Date()) ?? new Date(),
        };

        this.bindEvents();
        this.render();
    }

    private syncViewFromDate(date: NullableDate): void {
        if (!date) return;

        this.state.viewDate = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
        );
    }

    private render(): void {
        renderCalendarGrid({
            gridElement: this.gridElement,
            titleElement: this.titleElement,
            viewDate: this.state.viewDate,
            selectedDate: this.state.selectedDate,
            onSelectDate: (date: Date) => {
                const normalized = normalizeUTCDate(date);
                if (!normalized) return;

                this.state.selectedDate = normalized;
                this.syncViewFromDate(normalized);

                this.input.updateFromDate(normalized);
                this.render();
                this.popover.close();
            },
        });
    }

    private bindEvents(): void {
        this.input.inputElement.addEventListener("focus", () => {
            this.popover.open();
            this.render();
        });

        this.input.inputElement.addEventListener("input", (event: Event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement)) return;

            this.input.update(target.value);

            const validDate = this.input.getValidDateOrNull();

            if (validDate) {
                this.state.selectedDate = validDate;
                this.syncViewFromDate(validDate);
            } else {
                this.state.selectedDate = null;
            }

            this.render();
        });

        this.prevButton.addEventListener("click", (event: MouseEvent) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month - 1, 1));
            this.render();
        });

        this.nextButton.addEventListener("click", (event: MouseEvent) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month + 1, 1));
            this.render();
        });
    }
}

class RangeDatePicker {
    private readonly startInput: InputDateBase;
    private readonly endInput: InputDateBase;
    private readonly titleElement: HTMLElement;
    private readonly gridElement: HTMLElement;
    private readonly prevButton: HTMLButtonElement;
    private readonly nextButton: HTMLButtonElement;
    private readonly popover: PopoverController;
    private readonly state: RangeDatePickerState;

    constructor() {
        this.startInput = new InputDateBase("range-start", "range-start");
        this.endInput = new InputDateBase("range-end", "range-end");

        this.titleElement = getRequiredElement("range-title");
        this.gridElement = getRequiredElement("range-grid");
        this.prevButton = getRequiredElement<HTMLButtonElement>("range-prev");
        this.nextButton = getRequiredElement<HTMLButtonElement>("range-next");

        this.popover = new PopoverController({
            rootId: "range-picker",
            triggerIds: [],
            contentId: "range-popover",
        });

        this.state = {
            startDate: null,
            endDate: null,
            activeField: "start",
            viewDate: normalizeUTCDate(new Date()) ?? new Date(),
        };

        this.bindEvents();
        this.render();
    }

    private syncViewFromDate(date: NullableDate): void {
        if (!date) return;

        this.state.viewDate = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
        );
    }

    private normalizeRangeOrder(): void {
        if (!this.state.startDate || !this.state.endDate) return;

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

    private render(): void {
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
            onSelectDate: (date: Date) => {
                const normalized = normalizeUTCDate(date);
                if (!normalized) return;

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
                    this.state.endDate ?? this.state.startDate,
                );
                this.render();
                this.popover.close();
            },
        });
    }

    private bindEvents(): void {
        this.startInput.inputElement.addEventListener("focus", () => {
            this.state.activeField = "start";
            this.syncViewFromDate(
                this.state.startDate ?? normalizeUTCDate(new Date()),
            );
            this.popover.open();
            this.render();
        });

        this.endInput.inputElement.addEventListener("focus", () => {
            this.state.activeField = "end";
            this.syncViewFromDate(
                this.state.endDate ??
                    this.state.startDate ??
                    normalizeUTCDate(new Date()),
            );
            this.popover.open();
            this.render();
        });

        this.startInput.inputElement.addEventListener(
            "input",
            (event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) return;

                this.startInput.update(target.value);

                const validDate = this.startInput.getValidDateOrNull();

                if (validDate) {
                    this.state.startDate = validDate;
                    this.syncViewFromDate(validDate);
                } else {
                    this.state.startDate = null;
                }

                this.normalizeRangeOrder();
                this.render();
            },
        );

        this.endInput.inputElement.addEventListener("input", (event: Event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement)) return;

            this.endInput.update(target.value);

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

        this.prevButton.addEventListener("click", (event: MouseEvent) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month - 1, 1));
            this.render();
        });

        this.nextButton.addEventListener("click", (event: MouseEvent) => {
            event.stopPropagation();

            const year = this.state.viewDate.getUTCFullYear();
            const month = this.state.viewDate.getUTCMonth();

            this.state.viewDate = new Date(Date.UTC(year, month + 1, 1));
            this.render();
        });
    }
}

new SingleDatePicker();
new RangeDatePicker();
