import React from 'react';
import { Calendar, Clock, User, Stethoscope } from 'lucide-react';

const PaymentSummary = ({ appointment }) => {
    if (!appointment) return null;

    return (
        <div className="bg-blue-600 w-full h-full flex flex-col items-center justify-center p-8 lg:p-12 text-white">
            
            <div className="w-full max-w-md">
                <h2 className="text-3xl font-bold mb-8 tracking-tight text-white">
                    Appointment Summary
                </h2>

                {/* White Background Card with Sharp Edges */}
                <div className="bg-white text-slate-900 p-8 shadow-2xl rounded-none">
                    <div className="space-y-6">
                        {/* Doctor Info */}
                        <div className="flex items-start space-x-4">
                            <div className="bg-slate-100 p-3 rounded-none shrink-0">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Doctor</p>
                                <p className="font-bold text-lg text-slate-900">{appointment.doctorFullName}</p>
                                <p className="text-sm text-blue-600 font-medium">{appointment.specialty}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 my-4"></div>

                        {/* Date & Time Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center space-x-2 mb-2 text-slate-500">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm font-medium uppercase tracking-wider">Date</span>
                                </div>
                                <p className="font-bold text-slate-900">
                                    {new Date(appointment.appointmentDate).toLocaleDateString()}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center space-x-2 mb-2 text-slate-500">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium uppercase tracking-wider">Time</span>
                                </div>
                                <p className="font-bold text-slate-900">{appointment.timeSlot}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 my-4"></div>

                        {/* Reason */}
                        <div>
                            <div className="flex items-center space-x-2 mb-2 text-slate-500">
                                <Stethoscope className="w-4 h-4" />
                                <span className="text-sm font-medium uppercase tracking-wider">Reason</span>
                            </div>
                            <p className="font-semibold text-slate-900">{appointment.reason}</p>
                        </div>

                        {/* Total Fee Highlight */}
                        <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 p-6 rounded-none">
                            <p className="text-sm text-blue-900 font-bold uppercase tracking-wider mb-2">Total Fee</p>
                            <p className="text-3xl font-bold text-blue-700">
                                ${Number(appointment?.consultationFee ?? 0).toLocaleString('en-US')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSummary;