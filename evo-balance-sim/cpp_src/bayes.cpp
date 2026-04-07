// bayes.cpp
// Pure Particle Filter (Monte Carlo Bayesian) Microservice

#include <cmath>
#include <algorithm>
#include <random>
#include <vector>

#define NUM_PARTICLES 100

struct BayesState {
    double particles[NUM_PARTICLES];
    std::mt19937 gen; // Random number generator
    bool initialized = false;
};

// Internal memory for this filter
static BayesState state{};

// Initialize particles around the starting angle (1.0 rad)
void init_particles() {
    std::normal_distribution<double> dist(1.0, 0.05);
    for (int i = 0; i < NUM_PARTICLES; i++) {
        state.particles[i] = dist(state.gen);
    }
    state.initialized = true;
}

extern "C" double filter_step(double gyro_meas, double accel_meas, double dt) {
    if (!state.initialized) init_particles();

    constexpr double gyro_var = 0.005;
    constexpr double accel_var = 0.01;
    
    std::normal_distribution<double> gyro_noise(0, gyro_var);
    double weights[NUM_PARTICLES];
    double total_weight = 0.0;

    // --- 1. PREDICT & 2. WEIGHT ---
    for (int i = 0; i < NUM_PARTICLES; i++) {
        // Move particle based on gyro + random "jitter" (Prediction)
        state.particles[i] += (gyro_meas * dt) + gyro_noise(state.gen);

        // Calculate how "correct" this particle is compared to accel (Weighting)
        double diff = accel_meas - state.particles[i];
        weights[i] = std::exp(-0.5 * (diff * diff) / (accel_var * accel_var));
        total_weight += weights[i];
    }

    // --- 3. RESAMPLE (Survival of the Fittest) ---
    // We use "Systematic Resampling" to pick the best particles to clone
    double new_particles[NUM_PARTICLES];
    double step = total_weight / NUM_PARTICLES;
    std::uniform_real_distribution<double> start_dist(0, step);
    double r = start_dist(state.gen);
    double c = weights[0];
    int idx = 0;

    for (int j = 0; j < NUM_PARTICLES; j++) {
        double U = r + j * step;
        while (U > c && idx < NUM_PARTICLES - 1) {
            idx++;
            c += weights[idx];
        }
        new_particles[j] = state.particles[idx];
    }

    // Calculate mean of the new swarm and update state
    double sum = 0;
    for (int i = 0; i < NUM_PARTICLES; i++) {
        state.particles[i] = new_particles[i];
        sum += state.particles[i];
    }

    return sum / NUM_PARTICLES;
}

extern "C" void filter_reset() {
    state.initialized = false;
    // The next filter_step call will trigger init_particles()
}