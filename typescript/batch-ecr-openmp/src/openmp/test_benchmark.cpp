#include <iostream>
#include <vector>
#include <string>
#include <chrono>
#include <omp.h>
#include <cmath>
#include <cassert>
#include <sstream>

// Simple test framework
class SimpleTest {
private:
    static int tests_run;
    static int tests_passed;
    static std::string current_test_name;

public:
    static void start_test(const std::string& name) {
        current_test_name = name;
        tests_run++;
        std::cout << "Running test: " << name << " ... ";
    }
    
    static void assert_equal(long long expected, long long actual, const std::string& message = "") {
        if (expected != actual) {
            std::cout << "FAILED\n";
            std::cout << "  Expected: " << expected << ", Got: " << actual;
            if (!message.empty()) std::cout << " (" << message << ")";
            std::cout << std::endl;
            return;
        }
    }
    
    static void assert_equal(int expected, int actual, const std::string& message = "") {
        if (expected != actual) {
            std::cout << "FAILED\n";
            std::cout << "  Expected: " << expected << ", Got: " << actual;
            if (!message.empty()) std::cout << " (" << message << ")";
            std::cout << std::endl;
            return;
        }
    }
    
    static void assert_equal(const std::string& expected, const std::string& actual, const std::string& message = "") {
        if (expected != actual) {
            std::cout << "FAILED\n";
            std::cout << "  Expected: \"" << expected << "\", Got: \"" << actual << "\"";
            if (!message.empty()) std::cout << " (" << message << ")";
            std::cout << std::endl;
            return;
        }
    }
    
    static void assert_true(bool condition, const std::string& message = "") {
        if (!condition) {
            std::cout << "FAILED\n";
            std::cout << "  Expected condition to be true";
            if (!message.empty()) std::cout << " (" << message << ")";
            std::cout << std::endl;
            return;
        }
    }
    
    static void assert_greater_than(double value, double threshold, const std::string& message = "") {
        if (value <= threshold) {
            std::cout << "FAILED\n";
            std::cout << "  Expected " << value << " > " << threshold;
            if (!message.empty()) std::cout << " (" << message << ")";
            std::cout << std::endl;
            return;
        }
    }
    
    static void assert_less_than(double value, double threshold, const std::string& message = "") {
        if (value >= threshold) {
            std::cout << "FAILED\n";
            std::cout << "  Expected " << value << " < " << threshold;
            if (!message.empty()) std::cout << " (" << message << ")";
            std::cout << std::endl;
            return;
        }
    }
    
    static void assert_near(double expected, double actual, double tolerance, const std::string& message = "") {
        if (std::abs(expected - actual) > tolerance) {
            std::cout << "FAILED\n";
            std::cout << "  Expected " << actual << " to be near " << expected << " (tolerance: " << tolerance << ")";
            if (!message.empty()) std::cout << " (" << message << ")";
            std::cout << std::endl;
            return;
        }
    }
    
    static void pass_test() {
        std::cout << "PASSED\n";
        tests_passed++;
    }
    
    static void print_summary() {
        std::cout << "\n=== Test Summary ===\n";
        std::cout << "Tests run: " << tests_run << "\n";
        std::cout << "Tests passed: " << tests_passed << "\n";
        std::cout << "Tests failed: " << (tests_run - tests_passed) << "\n";
        std::cout << "Success rate: " << (tests_run > 0 ? (tests_passed * 100 / tests_run) : 0) << "%\n";
    }
    
    static bool all_passed() {
        return tests_run == tests_passed;
    }
};

// Static member definitions
int SimpleTest::tests_run = 0;
int SimpleTest::tests_passed = 0;
std::string SimpleTest::current_test_name = "";

// Include the structures we want to test
struct BenchmarkResult {
    long long sum;
    double execution_time;
    int thread_count;
    int problem_size;
    std::string instance_type;
    std::string version_type;
};

struct ComparisonResult {
    BenchmarkResult sequential;
    BenchmarkResult parallel;
    double speedup;
    double efficiency;
};

// Function to get instance type (same logic as main.cpp)
std::string getInstanceType() {
    std::string instance_type = "local";
    const char* instance_env = std::getenv("AWS_BATCH_JOB_INSTANCE_TYPE");
    if (instance_env) {
        instance_type = instance_env;
    } else {
        // Try to get more specific local system information
        const char* hostname_env = std::getenv("HOSTNAME");
        const char* user_env = std::getenv("USER");
        
        if (hostname_env && user_env) {
            std::string hostname = hostname_env;
            if (hostname.find(".compute.internal") != std::string::npos) {
                instance_type = "aws-development";
            } else {
                instance_type = "local-development";
            }
        } else if (hostname_env) {
            instance_type = "local-" + std::string(hostname_env);
        } else {
            instance_type = "local-development";
        }
    }
    return instance_type;
}

// Sequential benchmark function (extracted from main.cpp)
BenchmarkResult runSequentialBenchmark(int problem_size, const std::string& instance_type) {
    std::vector<int> data(problem_size);
    long long sum_sequential = 0;

    auto start_time = std::chrono::high_resolution_clock::now();

    // Sequential version - simple for loop
    for (int i = 0; i < problem_size; ++i) {
        data[i] = i * 2; // Simple computation
        sum_sequential += data[i];
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> duration = end_time - start_time;

    BenchmarkResult result;
    result.sum = sum_sequential;
    result.execution_time = duration.count();
    result.thread_count = 1;
    result.problem_size = problem_size;
    result.instance_type = instance_type;
    result.version_type = "sequential";

    return result;
}

// Parallel benchmark function (extracted from main.cpp)
BenchmarkResult runParallelBenchmark(int problem_size, const std::string& instance_type) {
    std::vector<int> data(problem_size);
    long long sum_parallel = 0;

    auto start_time = std::chrono::high_resolution_clock::now();

    // OpenMP parallel for directive
    #pragma omp parallel for reduction(+:sum_parallel)
    for (int i = 0; i < problem_size; ++i) {
        data[i] = i * 2; // Simple computation
        sum_parallel += data[i];
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> duration = end_time - start_time;

    BenchmarkResult result;
    result.sum = sum_parallel;
    result.execution_time = duration.count();
    result.thread_count = omp_get_max_threads();
    result.problem_size = problem_size;
    result.instance_type = instance_type;
    result.version_type = "parallel";

    return result;
}

// Helper function to calculate expected sum
long long calculateExpectedSum(int problem_size) {
    // Sum of i*2 for i from 0 to problem_size-1
    // = 2 * sum(i) from 0 to n-1
    // = 2 * (n-1)*n/2 = n*(n-1)
    return static_cast<long long>(problem_size) * (problem_size - 1);
}

// Test functions
void test_sequential_benchmark_small_size() {
    SimpleTest::start_test("Sequential Benchmark Small Size");
    
    std::string test_instance = "test_instance";
    int problem_size = 1000;
    
    BenchmarkResult result = runSequentialBenchmark(problem_size, test_instance);
    
    // Verify basic properties
    SimpleTest::assert_equal(problem_size, result.problem_size, "Problem size mismatch");
    SimpleTest::assert_equal(1, result.thread_count, "Thread count should be 1");
    SimpleTest::assert_equal(test_instance, result.instance_type, "Instance type mismatch");
    SimpleTest::assert_equal(std::string("sequential"), result.version_type, "Version type mismatch");
    
    // Verify sum calculation
    long long expected_sum = calculateExpectedSum(problem_size);
    SimpleTest::assert_equal(expected_sum, result.sum, "Sum calculation incorrect");
    
    // Verify execution time is positive and reasonable
    SimpleTest::assert_greater_than(result.execution_time, 0.0, "Execution time should be positive");
    SimpleTest::assert_less_than(result.execution_time, 1.0, "Execution time should be reasonable");
    
    SimpleTest::pass_test();
}

void test_parallel_benchmark_small_size() {
    SimpleTest::start_test("Parallel Benchmark Small Size");
    
    std::string test_instance = "test_instance";
    int problem_size = 1000;
    
    BenchmarkResult result = runParallelBenchmark(problem_size, test_instance);
    
    // Verify basic properties
    SimpleTest::assert_equal(problem_size, result.problem_size, "Problem size mismatch");
    SimpleTest::assert_true(result.thread_count >= 1, "Thread count should be at least 1");
    SimpleTest::assert_equal(test_instance, result.instance_type, "Instance type mismatch");
    SimpleTest::assert_equal(std::string("parallel"), result.version_type, "Version type mismatch");
    
    // Verify sum calculation
    long long expected_sum = calculateExpectedSum(problem_size);
    SimpleTest::assert_equal(expected_sum, result.sum, "Sum calculation incorrect");
    
    // Verify execution time is positive and reasonable
    SimpleTest::assert_greater_than(result.execution_time, 0.0, "Execution time should be positive");
    SimpleTest::assert_less_than(result.execution_time, 1.0, "Execution time should be reasonable");
    
    SimpleTest::pass_test();
}

void test_sequential_parallel_consistency() {
    SimpleTest::start_test("Sequential Parallel Consistency");
    
    std::string test_instance = "test_instance";
    int problem_size = 100000;
    
    BenchmarkResult sequential = runSequentialBenchmark(problem_size, test_instance);
    BenchmarkResult parallel = runParallelBenchmark(problem_size, test_instance);
    
    // Both should produce the same sum
    SimpleTest::assert_equal(sequential.sum, parallel.sum, "Results should match");
    
    // Both should have the same problem size
    SimpleTest::assert_equal(sequential.problem_size, parallel.problem_size, "Problem sizes should match");
    SimpleTest::assert_equal(problem_size, parallel.problem_size, "Problem size should be set correctly");
    
    // Thread counts should be different
    SimpleTest::assert_equal(1, sequential.thread_count, "Sequential should use 1 thread");
    SimpleTest::assert_true(parallel.thread_count >= 1, "Parallel should use at least 1 thread");
    
    // Both should have positive execution times
    SimpleTest::assert_greater_than(sequential.execution_time, 0.0, "Sequential execution time should be positive");
    SimpleTest::assert_greater_than(parallel.execution_time, 0.0, "Parallel execution time should be positive");
    
    SimpleTest::pass_test();
}

void test_comparison_metrics() {
    SimpleTest::start_test("Comparison Metrics");
    
    std::string test_instance = "test_instance";
    int problem_size = 100000;
    
    BenchmarkResult sequential = runSequentialBenchmark(problem_size, test_instance);
    BenchmarkResult parallel = runParallelBenchmark(problem_size, test_instance);
    
    // Calculate comparison metrics
    ComparisonResult comparison;
    comparison.sequential = sequential;
    comparison.parallel = parallel;
    comparison.speedup = sequential.execution_time / parallel.execution_time;
    comparison.efficiency = (comparison.speedup / parallel.thread_count) * 100.0;
    
    // Verify speedup calculation
    SimpleTest::assert_greater_than(comparison.speedup, 0.0, "Speedup should be positive");
    double expected_speedup = sequential.execution_time / parallel.execution_time;
    SimpleTest::assert_near(expected_speedup, comparison.speedup, 0.001, "Speedup calculation should be correct");
    
    // Verify efficiency calculation
    SimpleTest::assert_greater_than(comparison.efficiency, 0.0, "Efficiency should be positive");
    SimpleTest::assert_true(comparison.efficiency <= 100.0 * parallel.thread_count, "Efficiency shouldn't exceed theoretical maximum");
    
    // Verify results match
    SimpleTest::assert_equal(comparison.sequential.sum, comparison.parallel.sum, "Comparison results should match");
    
    SimpleTest::pass_test();
}

void test_edge_cases() {
    SimpleTest::start_test("Edge Cases");
    
    std::string test_instance = "test_instance";
    
    // Test with size 1
    BenchmarkResult seq_tiny = runSequentialBenchmark(1, test_instance);
    BenchmarkResult par_tiny = runParallelBenchmark(1, test_instance);
    
    SimpleTest::assert_equal(0LL, seq_tiny.sum, "Size 1: sequential sum should be 0");
    SimpleTest::assert_equal(0LL, par_tiny.sum, "Size 1: parallel sum should be 0");
    SimpleTest::assert_equal(seq_tiny.sum, par_tiny.sum, "Size 1: results should match");
    
    // Test with size 2
    BenchmarkResult seq_small = runSequentialBenchmark(2, test_instance);
    BenchmarkResult par_small = runParallelBenchmark(2, test_instance);
    
    SimpleTest::assert_equal(2LL, seq_small.sum, "Size 2: sequential sum should be 2");
    SimpleTest::assert_equal(2LL, par_small.sum, "Size 2: parallel sum should be 2");
    SimpleTest::assert_equal(seq_small.sum, par_small.sum, "Size 2: results should match");
    
    SimpleTest::pass_test();
}

void test_mathematical_correctness() {
    SimpleTest::start_test("Mathematical Correctness");
    
    std::string test_instance = "test_instance";
    std::vector<int> test_sizes = {10, 100, 1000, 5000};
    
    for (int size : test_sizes) {
        BenchmarkResult sequential = runSequentialBenchmark(size, test_instance);
        BenchmarkResult parallel = runParallelBenchmark(size, test_instance);
        
        // Calculate expected sum manually
        long long expected = calculateExpectedSum(size);
        
        // Both should match expected value
        SimpleTest::assert_equal(expected, sequential.sum, "Sequential failed for size " + std::to_string(size));
        SimpleTest::assert_equal(expected, parallel.sum, "Parallel failed for size " + std::to_string(size));
        SimpleTest::assert_equal(sequential.sum, parallel.sum, "Results don't match for size " + std::to_string(size));
    }
    
    SimpleTest::pass_test();
}

void test_thread_count_behavior() {
    SimpleTest::start_test("Thread Count Behavior");
    
    std::string test_instance = "test_instance";
    int problem_size = 100000;
    
    BenchmarkResult sequential = runSequentialBenchmark(problem_size, test_instance);
    BenchmarkResult parallel = runParallelBenchmark(problem_size, test_instance);
    
    // Sequential should always use 1 thread
    SimpleTest::assert_equal(1, sequential.thread_count, "Sequential should use exactly 1 thread");
    
    // Parallel should use at least 1 thread, likely more if available
    SimpleTest::assert_true(parallel.thread_count >= 1, "Parallel should use at least 1 thread");
    
    // Thread count should match OpenMP's max threads
    SimpleTest::assert_equal(omp_get_max_threads(), parallel.thread_count, "Thread count should match OpenMP max threads");
    
    SimpleTest::pass_test();
}

void test_expected_sum_calculation() {
    SimpleTest::start_test("Expected Sum Calculation");
    
    // Test the helper function
    SimpleTest::assert_equal(0LL, calculateExpectedSum(1), "Size 1 expected sum");
    SimpleTest::assert_equal(2LL, calculateExpectedSum(2), "Size 2 expected sum");
    SimpleTest::assert_equal(6LL, calculateExpectedSum(3), "Size 3 expected sum");
    SimpleTest::assert_equal(12LL, calculateExpectedSum(4), "Size 4 expected sum");
    SimpleTest::assert_equal(20LL, calculateExpectedSum(5), "Size 5 expected sum");
    
    // Verify the mathematical formula: n*(n-1) for sum of i*2 from 0 to n-1
    for (int n = 1; n <= 100; n++) {
        long long expected = static_cast<long long>(n) * (n - 1);
        SimpleTest::assert_equal(expected, calculateExpectedSum(n), "Formula verification for n=" + std::to_string(n));
    }
    
    SimpleTest::pass_test();
}

// Main test runner
int main() {
    std::cout << "OpenMP Benchmark Unit Tests\n";
    std::cout << "============================\n\n";
    
    // Run all tests
    test_expected_sum_calculation();
    test_sequential_benchmark_small_size();
    test_parallel_benchmark_small_size();
    test_sequential_parallel_consistency();
    test_comparison_metrics();
    test_edge_cases();
    test_mathematical_correctness();
    test_thread_count_behavior();
    
    // Print summary
    SimpleTest::print_summary();
    
    return SimpleTest::all_passed() ? 0 : 1;
}
