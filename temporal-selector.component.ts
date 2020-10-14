import { Component, OnInit, Input, ElementRef, ViewChild, HostListener, ChangeDetectorRef, EventEmitter, Output, Renderer2 } from '@angular/core';
import { TemplateParseError } from '@angular/compiler';


export interface temporalEvent {
  id: any,
  label: string,
  date: Date,
  route: string,
}

export interface eventSelected {
  id: any
}

interface label {
  day: string,
  date: string
}

@Component({
  selector: 'app-temporal-selector',
  templateUrl: './temporal-selector.component.html',
  styleUrls: ['./temporal-selector.component.css']
})
export class TemporalSelectorComponent implements OnInit {
  private _temporalEvents: temporalEvent[];
  @Input() set temporalEvents(value: temporalEvent[]) {

    this._temporalEvents = value;
    if (this.viewInit) {
      this.isLoading = true;
      this.initTimeLineData();
      this.setLabels();
      this.initTimelineSpacing();
      this.placeEvents();
      this.transformTimeline();
      this.scaleFillingLine();

      this.isLoading = false;
    }


  }

  get temporalEvents(): temporalEvent[] {
    return this._temporalEvents;
  }


  @ViewChild('events') eventsRef: ElementRef;

  @ViewChild('eventsLine') eventsLineRef: ElementRef;

  @ViewChild('eventsWrapper') eventsWrapperRef: ElementRef;

  @ViewChild('fillingLine') fillingRef: ElementRef;

  viewInit: boolean = false;

  //Year, Month, Day
  curWeekStart: Date;
  //curDay: Date;
  curWeekEnd: Date;
  curIndex: number;

  visibleDates: Date[];

  isLoading: boolean = true;

  labels: label[] = [];

  private _curEventId: number;

  @Input() set curEventId(value: number) {
    this._curEventId = value;

    if (this.temporalEvents != null && this.temporalEvents.length > 0) {
      this.initTimeLineData();
      this.transformTimeline();
      this.scaleFillingLine();

    }
  }

  get curEventId(): number {

    return this._curEventId;

  }

  @Output() eventSelectedEvent: EventEmitter<eventSelected> = new EventEmitter<eventSelected>();

  constructor(private changeDetector: ChangeDetectorRef, private renderer: Renderer2,) { }

  ngOnInit(): void {
  }


  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (this.viewInit) {

      this.initTimeLineData();
      this.setLabels();
      this.initTimelineSpacing();
      this.placeEvents();
      this.transformTimeline();
      this.scaleFillingLine();
    }
  }

  ngAfterViewInit() {
    this.viewInit = true;
  }

  //public updateCurrent(currentId: number) {
  //  this._curEventId = currentId;
  //}
  /**
   * ***************************
   * @param event
   * @param id
   */
  private eventClicked(event, id) {
    this.eventSelectedEvent.emit({
      id: id
    });

  }

  private scaleFillingLine() {
    let ind = this._temporalEvents.findIndex(elem => elem.id == this.curEventId);
    let distance = this.distanceToEvent(ind);
    let scaleValue = distance / this.timeLineWidth();
    this.setTransformValue(this.fillingRef.nativeElement, 'scaleX', scaleValue);
  }

  private setLabels() {
    let weekStart = this.curWeekStart;
    while (weekStart > this.temporalEvents[0].date) {
      weekStart = this.addDaysToDate(weekStart, -7);

    }

    let week = 0;
    while (weekStart < this.temporalEvents[this.temporalEvents.length - 1].date) {
      for (let i = 0; i < 7; i++) {
        this.labels[week * 7 + i] = this.getLabel2(weekStart, this.addDaysToDate(weekStart, 6), i);
      }
      week++;
      weekStart = this.addDaysToDate(weekStart, 7);
    }


    this.changeDetector.detectChanges();
    let weekElems = this.eventsRef.nativeElement.getElementsByClassName("event-label");

    let spaceBtwDays = this.timeLineWidth() / 8;

    let offset = spaceBtwDays;
    for (var i = 0; i < weekElems.length; i++) {
      weekElems[i].style.left = offset - (weekElems[i].clientWidth / 2) + 'px';

      offset += spaceBtwDays;
    }

  }

  private addDaysToDate(date: Date, days: number) {
    let d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private getLabel2(weekStart: Date, weekEnd: Date, daysFromStart: number) : label {
    let days = ['Sun', 'Mon', 'Tue', "Wed", 'Thu', 'Fri', 'Sat'];

    if (this.temporalEvents == null || this.temporalEvents.length == 0) {
      return null;
    }
    let multipleMonths = weekStart.getMonth() != weekEnd.getMonth();
    let date = '';



    var d = new Date(weekStart);
    d.setDate(d.getDate() + daysFromStart);

    if ((daysFromStart == 0 && !multipleMonths) || d.getDate() == 1 && multipleMonths) {

      date += this.getMonthStart(d) + ' ';
    }
    date += d.getDate();
    return {
      day: days[daysFromStart],
      date: date
    };
  }

  private dateFromStart(numDays: number) {
    var d = new Date(this.curWeekStart);
    d.setDate(d.getDate() + numDays);
    return d.getDate();
  }

  private getMonthStart(date: Date) {
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[date.getMonth()];
  }

  private prevEvent() {
    let currIndex = this.temporalEvents.findIndex(elem => elem.id == this.curEventId);
    if (currIndex == 0) {

      return;
    }

    this.eventSelectedEvent.emit({
      id: this.temporalEvents[currIndex - 1].id
    });
  }

  private nextEvent() {
    let currIndex = this.temporalEvents.findIndex(elem => elem.id == this.curEventId);
    if ((currIndex + 1) == this.temporalEvents.length) {

      return;
    }

    this.eventSelectedEvent.emit({
      id: this.temporalEvents[currIndex + 1].id
    });

  }

  private prevWeek() {
  
    let weekBefore = new Date(this.curWeekEnd.getTime());
    weekBefore.setDate(weekBefore.getDate() - 7);

    if (weekBefore < this.temporalEvents[0].date) {

      return;
    }

    if(this.curWeekEnd)

    this.curWeekStart.setDate(this.curWeekStart.getDate() - 7);
    this.curWeekEnd.setDate(this.curWeekEnd.getDate() - 7);
   
    this.transformTimeline();
  }



  private transformTimeline() {
    let weekStart = this.temporalEvents[0].date;
    let weekNum = this.diffInWeeks(this.curWeekStart, weekStart);
    let transValue = this.timeLineWidth() / 8 * 7 * weekNum;
    this.setTransformValue(this.eventsRef.nativeElement, 'translateX', transValue + 'px');
  }

  private nextWeek() {

    let weekAfter = new Date(this.curWeekStart.getTime());
    weekAfter.setDate(weekAfter.getDate() + 7);

    if (weekAfter > this.temporalEvents[this.temporalEvents.length - 1].date) {

      return;
    }

    this.curWeekStart.setDate(this.curWeekStart.getDate() + 7);
    this.curWeekEnd.setDate(this.curWeekEnd.getDate() + 7);
    this.transformTimeline();
  }

  private initTimeLineData() {
    if (this.temporalEvents.length == 0) {
      return;
    }


    this.curIndex = this.temporalEvents.findIndex(elem => elem.id == this._curEventId);
    console.log(this.curIndex);
    let curDay = this.temporalEvents[this.curIndex].date;
    let first = curDay.getDate() -
      curDay.getDay();

    let last = first + 6;

    this.curWeekStart = new Date(new Date(new Date(curDay).setDate(first)).setHours(0, 0, 0, 0));
    this.curWeekEnd = new Date(new Date(new Date(curDay).setDate(last)).setHours(23, 59, 59, 999));

  }

  private placeEvents() {
    let eventElems = this.eventsRef.nativeElement.getElementsByClassName("event");
    for (let i = 0; i < this._temporalEvents.length; i++) {
      eventElems[i].style.left = this.distanceToEvent(i) + 'px';
    }
  }

  private diffInTime(date: Date, date2: Date) {
    return date2.getTime() - date.getTime();
  }

  private diffInWeeks(date: Date, date2: Date) {
    return Math.floor(this.diffInDays(date, date2) / 7);
  }

  private diffInDays(date: Date, date2: Date) {
    return this.diffInTime(date, date2) / (1000 * 3600 * 24);
  }

  private distanceToEvent(index: number) {
    let eventElems = this.eventsRef.nativeElement.getElementsByClassName("event");

    let distanceWeek = this.distanceToWeek(this.temporalEvents[index].date);

    let distanceDay = this.distanceToDay(this._temporalEvents[index].date.getDay());

    let distanceHour = this.distanceToHour(this._temporalEvents[index].date.getHours());


    let distance = distanceWeek + distanceDay + distanceHour -
      (eventElems[index].clientWidth / 2);

    return distance
  }

  private distanceToWeek(date: Date) {

    let weekStart = this.curWeekStart;
    while (weekStart > this.temporalEvents[0].date) {
      weekStart = this.addDaysToDate(weekStart, -7);

    }
    let weeksFromStart = Math.floor(this.diffInDays(weekStart, date) / 7);

    let spaceBtwWeeks = this.timeLineWidth() / 8 * 7;

    let distanceWeek = spaceBtwWeeks * weeksFromStart;

    return distanceWeek;
  }

  private distanceToDay(dayOfWeek : number) {
    let timeLineWidth = this.timeLineWidth();
    let spaceBtwDays = timeLineWidth / 8;
    return spaceBtwDays * (dayOfWeek + 1);
  }

  private distanceToHour(hour: number) {

    let timeLineWidth = this.timeLineWidth();
    let spaceBtwHours = timeLineWidth / 8 / 24;

    return spaceBtwHours * hour;
  }

  private initTimelineSpacing() {
    //Width of weekElems[i] may change so detect it
    this.changeDetector.detectChanges();

    let timeLineWidth = this.timeLineWidth();
    let weekElems = this.eventsWrapperRef.nativeElement.getElementsByClassName("day-marker");
    let spaceBtwDays = timeLineWidth / 8;

    let offset = spaceBtwDays;
    for (var i = 0; i < weekElems.length; i++) {
      weekElems[i].style.left = offset - (weekElems[i].clientWidth / 2) + 'px';
      offset += spaceBtwDays;
    }



    this.setTimeLineWidth();
  }

  private setTransformValue(element, property, value) {
    element.style["-webkit-transform"] = property + "(" + value + ")";
    element.style["-moz-transform"] = property + "(" + value + ")";
    element.style["-ms-transform"] = property + "(" + value + ")";
    element.style["-o-transform"] = property + "(" + value + ")";
    element.style["transform"] = property + "(" + value + ")";
  }


  private setTimeLineWidth() {
    let wrapperWidth = this.eventsWrapperRef.nativeElement.clientWidth;

    let numWeeks = this.diff_weeks(this.temporalEvents[this.temporalEvents.length - 1].date, this.temporalEvents[0].date);

    this.eventsLineRef.nativeElement.style['width'] = wrapperWidth * numWeeks + 'px';
  }

  private timeLineWidth() {
    return Number(this.eventsWrapperRef.nativeElement.clientWidth);
  }

  private diff_weeks(dt2: Date, dt1: Date) {

    var diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= (60 * 60 * 24 * 7);
    return Math.abs(Math.round(diff));

  }

  private navWeekBackDisabled() {
    if (this.temporalEvents.length == 0) {
      return true;
    }

    return this.curWeekStart <= this.temporalEvents[0].date && this.curWeekEnd >= this.temporalEvents[0].date;
  }

  private navWeekForwardDisabled() {
    if (this.temporalEvents.length == 0) {
      return true;
    }

    return this.curWeekStart <= this.temporalEvents[this.temporalEvents.length - 1].date &&
           this.curWeekEnd >= this.temporalEvents[this.temporalEvents.length - 1].date;
  }

}
