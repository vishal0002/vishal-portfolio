#include <algorithm>
#include <cmath>

struct BalanceState {
    double theta = 1.0;
    double omega = 0.0;
    double theta_est = 1.0;
    double theta_var = 0.01;
    double error_sum = 0.0;
    double prev_error = 0.0;
};

// Global state so both the step and reset functions share the same memory
static BalanceState global_state{};

extern "C" void balance_step(
    double Kp, double Ki, double Kd,
    double gyro_meas, double accel_meas, double dt,
    double* theta_out, double* omega_out,
    double* torque_out, double* theta_est_out
) {
    constexpr double J = 0.005;
    constexpr double max_torque = 0.5;
    constexpr double gyro_var = 0.005 * 0.005;
    constexpr double accel_var = 0.01 * 0.01;

    // --- Predict ---
    const double theta_pred = global_state.theta_est + gyro_meas * dt;
    const double theta_pred_var = global_state.theta_var + gyro_var * dt * dt;

    // --- Update (Kalman) ---
    const double kalman_gain = theta_pred_var / (theta_pred_var + accel_var);
    global_state.theta_est = theta_pred + kalman_gain * (accel_meas - theta_pred);
    global_state.theta_var = (1.0 - kalman_gain) * theta_pred_var;

    // --- PID ---
    const double error = -global_state.theta_est;
    global_state.error_sum += error * dt;
    const double error_rate = (error - global_state.prev_error) / dt;
    global_state.prev_error = error;

    double motor_torque = Kp * error + Ki * global_state.error_sum + Kd * error_rate;
    motor_torque = std::clamp(motor_torque, -max_torque, max_torque);

    // --- Plant ---
    const double alpha_wheel = motor_torque / J;
    global_state.omega += alpha_wheel * dt;
    global_state.theta += global_state.omega * dt;

    // --- Outputs (Write to pointers) ---
    if (theta_out) *theta_out = global_state.theta;
    if (omega_out) *omega_out = global_state.omega;
    if (torque_out) *torque_out = motor_torque;
    if (theta_est_out) *theta_est_out = global_state.theta_est;
}

// Resets the global memory back to initial conditions
extern "C" void balance_reset() {
    global_state = BalanceState{}; 
}
