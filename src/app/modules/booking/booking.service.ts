/* eslint-disable @typescript-eslint/no-explicit-any */
import { initiatePayment } from "../payment/payment.utils";
import { Service, Slot } from "../service/service.model";
import { TBooking } from "./booking.interface";
import { Booking } from "./booking.model";
// import { Booking } from "./bookings.model";
// import { TBooking } from "./bookings.interface";
// import { initiatePayment } from "../payment/payment.utils";
// ============================================================
// Booking Services
// ============================================================
export const createBookingIntoDB = async (payload: TBooking) => {
  const {
    customer,
    serviceId,
    slotId,
    vehicleType,
    vehicleBrand,
    vehicleModel,
    manufacturingYear,
    registrationPlate,
  } = payload;

  // Check for customer info completeness
  if (
    !customer ||
    !customer.name ||
    !customer.email ||
    !customer.phone ||
    !customer.address
  ) {
    throw new Error("Customer information is incomplete");
  }

  // Find the slot
  const slot = await Slot.findById(slotId);
  if (!slot) {
    throw new Error("Slot not found");
  }

  // Check if the slot is available
  if (slot.isBooked !== "available") {
    throw new Error("Slot is already booked or canceled");
  }

  // Find the service
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error("Service not found");
  }

  // Prepare booking details
  const tran_id = `trans_${Date.now()}`;
  const bookingDetails = {
    tran_id,
    amount: service.price,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    },
  };

  // Initiate payment
  const { status, paymentUrl } = await initiatePayment(bookingDetails);

  // Only proceed if the payment is successful
  if (status === 200) {
    // Prepare the result object for booking
    const result = {
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      service: {
        _id: service._id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        isDeleted: service.isDeleted,
      },
      slot: {
        _id: slot._id,
        service: slot.service,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: "booked",
      },
      vehicleType,
      vehicleBrand,
      vehicleModel,
      manufacturingYear,
      registrationPlate,
      tran_id,
    };

    // Create a new booking
    const booking = await Booking.create(result);

    // Update the slot status to booked
    slot.isBooked = "booked";
    await slot.save();

    // Return the booking including the generated _id
    return { ...result, _id: booking._id, paymentUrl };
  } else {
    throw new Error("Payment failed. Booking was not created.");
  }
};

// Function to get all bookings from the database
const getAllBookingsFromDB = async () => {
  const bookings = await Booking.find();
  return bookings;
};

const getBookingsByUserEmail = async (email: string) => {
  const bookings = await Booking.find({ "customer.email": email }).exec();
  return bookings;
};

export const BookingServices = {
  createBookingIntoDB,
  getAllBookingsFromDB,
  getBookingsByUserEmail,
};