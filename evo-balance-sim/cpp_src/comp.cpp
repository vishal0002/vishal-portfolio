// comp.cpp
// Pure Complementary Filter Microservice

struct CompState {
    double theta_est = 1.0;  // Starts matching the physical simulation
};

// Internal memory for this specific filter
static CompState state{};

// extern "C" prevents C++ name mangling so JavaScript can find the function
extern "C" double filter_step(double gyro_meas, double accel_meas, double dt) {
    // The Complementary Filter tuning parameter (Alpha)
    // 0.98 means we trust the gyro 98% (short term) and the accel 2% (long term)
    constexpr double alpha = 0.98;

    // --- COMPLEMENTARY MATH ---
    // High-pass the gyro (fast changes) and low-pass the accel (absolute gravity reference)
    state.theta_est = alpha * (state.theta_est + gyro_meas * dt) + (1.0 - alpha) * accel_meas;

    // Return the single estimated angle directly to JavaScript
    return state.theta_est;
}

// Reset function so we can restart the simulation from the UI
extern "C" void filter_reset() {
    state = CompState{};
}