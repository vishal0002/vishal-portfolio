// kalman.cpp
// Pure Kalman Filter Microservice

struct KalmanState {
    double theta_est = 1.0;  // Starts matching the physical simulation
    double theta_var = 0.01; // Initial uncertainty
};

// Internal memory for this specific filter
static KalmanState state{};

// extern "C" prevents C++ name mangling so JavaScript can find the function
extern "C" double filter_step(double gyro_meas, double accel_meas, double dt) {
    // Sensor variance constants
    constexpr double gyro_var = 0.005 * 0.005;
    constexpr double accel_var = 0.01 * 0.01;

    // --- PREDICT STEP ---
    // Project the state ahead using the gyroscope
    double theta_pred = state.theta_est + gyro_meas * dt;
    double theta_pred_var = state.theta_var + gyro_var * dt * dt;

    // --- UPDATE STEP ---
    // Correct the projection using the accelerometer
    double kalman_gain = theta_pred_var / (theta_pred_var + accel_var);
    state.theta_est = theta_pred + kalman_gain * (accel_meas - theta_pred);
    state.theta_var = (1.0 - kalman_gain) * theta_pred_var;

    // Return the single estimated angle directly to JavaScript!
    return state.theta_est;
}

// Reset function so we can restart the simulation from the UI
extern "C" void filter_reset() {
    state = KalmanState{};
}