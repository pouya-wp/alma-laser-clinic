import React from 'react';
import { Calendar, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { getUpcomingDays, TIME_SLOTS, DayOption } from '../lib/jalali';

interface JalaliDatePickerProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  selectedTime: string;
  onSelectTime: (time: string) => void;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
}) => {
  const days = getUpcomingDays(12);

  return (
    <div className="space-y-4">
      {/* Date Carousel */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-alma-400" />
          انتخاب روز نوبت (تقویم شمسی):
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {days.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => onSelectDate(d.dateStr)}
                className={`flex-shrink-0 w-20 py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border ${
                  isSelected
                    ? 'bg-gradient-to-b from-alma-600 to-alma-500 text-white border-alma-400 shadow-glow-alma transform scale-105'
                    : 'bg-obsidian-900/80 border-white/10 text-slate-300 hover:border-alma-500/30'
                }`}
              >
                <span className="text-[10px] font-medium opacity-80">
                  {d.isToday ? 'امروز' : d.dayName}
                </span>
                <span className="text-lg font-black my-0.5">{d.dayNumber}</span>
                <span className="text-[10px] opacity-75">{d.monthName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Grid */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-alma-400" />
          انتخاب ساعت مراجعه:
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {TIME_SLOTS.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                onClick={() => onSelectTime(time)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all duration-200 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-alma-600 to-alma-500 text-white border-alma-400 shadow-glow-alma'
                    : 'bg-obsidian-900/80 border-white/10 text-slate-300 hover:border-alma-500/40 hover:text-white'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
