#include <iostream>   // For std::cout
#include <vector>     // For std::vector
#include <string>     // For std::string and C++20 features like starts_with
#include <chrono>     // For timing
#include <omp.h>      // For OpenMP directives
#include <cstdlib>    // For atoi, getenv
#include <iomanip>    // For JSON formatting
#include <cmath>      // For mathematical functions
#include <algorithm>  // For std::fill
#include <random>     // For random number generation

enum class BenchmarkType {
    SIMPLE,
    MATH,
    MATRIX, 
    HEAVY,
    ALL
};

struct BenchmarkResult {
    long long sum;
    double execution_time;
    int thread_count;
    int problem_size;
    std::string instance_type;
    std::string version_type; // "sequential" or "parallel"
    std::string benchmark_name;
    double flops; // Floating point operations performed
};

struct MultiBenchmarkResult {
    std::vector<BenchmarkResult> sequential_results;
    std::vector<BenchmarkResult> parallel_results;
    double total_time;
    int total_threads;
    std::string instance_type;
};

struct ComparisonResult {
    BenchmarkResult sequential;
    BenchmarkResult parallel;
    double speedup;
    double efficiency;
};

void printJsonComparison(const ComparisonResult& comparison) {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    
    std::cout << "{\n";
    std::cout << "  \"benchmark_type\": \"sequential_vs_parallel_comparison\",\n";
    std::cout << "  \"benchmark_name\": \"" << comparison.parallel.benchmark_name << "\",\n";
    std::cout << "  \"problem_size\": " << comparison.sequential.problem_size << ",\n";
    std::cout << "  \"sequential\": {\n";
    std::cout << "    \"calculated_sum\": " << comparison.sequential.sum << ",\n";
    std::cout << "    \"execution_time_seconds\": " << std::fixed << std::setprecision(6) << comparison.sequential.execution_time << ",\n";
    std::cout << "    \"gflops\": " << std::fixed << std::setprecision(2) << (comparison.sequential.flops / comparison.sequential.execution_time / 1000000000.0) << ",\n";
    std::cout << "    \"thread_count\": " << comparison.sequential.thread_count << "\n";
    std::cout << "  },\n";
    std::cout << "  \"parallel\": {\n";
    std::cout << "    \"calculated_sum\": " << comparison.parallel.sum << ",\n";
    std::cout << "    \"execution_time_seconds\": " << std::fixed << std::setprecision(6) << comparison.parallel.execution_time << ",\n";
    std::cout << "    \"gflops\": " << std::fixed << std::setprecision(2) << (comparison.parallel.flops / comparison.parallel.execution_time / 1000000000.0) << ",\n";
    std::cout << "    \"thread_count\": " << comparison.parallel.thread_count << "\n";
    std::cout << "  },\n";
    std::cout << "  \"comparison\": {\n";
    std::cout << "    \"speedup\": " << std::fixed << std::setprecision(2) << comparison.speedup << ",\n";
    std::cout << "    \"efficiency_percent\": " << std::fixed << std::setprecision(2) << comparison.efficiency << ",\n";
    std::cout << "    \"results_match\": " << (comparison.sequential.sum == comparison.parallel.sum ? "true" : "false") << "\n";
    std::cout << "  },\n";
    std::cout << "  \"performance_unit\": \"gflops\",\n";
    std::cout << "  \"instance_type\": \"" << comparison.sequential.instance_type << "\",\n";
    std::cout << "  \"timestamp\": \"" << std::put_time(std::gmtime(&time_t), "%Y-%m-%dT%H:%M:%SZ") << "\",\n";
#ifdef _OPENMP
    std::cout << "  \"openmp_version\": \"" << _OPENMP << "\",\n";
#else
    std::cout << "  \"openmp_version\": \"not_available\",\n";
#endif
    std::cout << "  \"cpp_standard\": \"C++20\"\n";
    std::cout << "}\n";
}

// Simple arithmetic benchmark
BenchmarkResult runSimpleBenchmark(bool parallel, int problem_size, const std::string& instance_type) {
    std::vector<int> data(problem_size);
    long long sum_result = 0;

    auto start_time = std::chrono::high_resolution_clock::now();

    if (parallel) {
        #pragma omp parallel for reduction(+:sum_result)
        for (int i = 0; i < problem_size; ++i) {
            data[i] = i * 2; // Simple computation
            sum_result += data[i];
        }
    } else {
        for (int i = 0; i < problem_size; ++i) {
            data[i] = i * 2; // Simple computation
            sum_result += data[i];
        }
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> duration = end_time - start_time;

    BenchmarkResult result;
    result.sum = sum_result;
    result.execution_time = duration.count();
    result.thread_count = parallel ? omp_get_max_threads() : 1;
    result.problem_size = problem_size;
    result.instance_type = instance_type;
    result.version_type = parallel ? "parallel" : "sequential";
    result.benchmark_name = "simple";
    result.flops = problem_size * 2.0; // 2 ops per element: multiply + add

    return result;
}

// Math Functions Benchmark - CPU intensive floating point operations
BenchmarkResult runMathBenchmark(bool parallel, int problem_size, const std::string& instance_type) {
    std::vector<double> data(problem_size);
    double sum_result = 0.0;
    
    auto start_time = std::chrono::high_resolution_clock::now();
    
    if (parallel) {
        #pragma omp parallel for reduction(+:sum_result)
        for (int i = 0; i < problem_size; ++i) {
            double x = i * 0.001; // Scale to avoid overflow
            // CPU-intensive mathematical operations
            double result = std::sin(x) + std::cos(x * 1.5) + std::sqrt(i + 1.0) + std::pow(x, 2.3);
            data[i] = result;
            sum_result += result;
        }
    } else {
        for (int i = 0; i < problem_size; ++i) {
            double x = i * 0.001;
            double result = std::sin(x) + std::cos(x * 1.5) + std::sqrt(i + 1.0) + std::pow(x, 2.3);
            data[i] = result;
            sum_result += result;
        }
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> duration = end_time - start_time;
    
    BenchmarkResult result;
    result.sum = static_cast<long long>(sum_result * 1000); // Scale for integer representation
    result.execution_time = duration.count();
    result.thread_count = parallel ? omp_get_max_threads() : 1;
    result.problem_size = problem_size;
    result.instance_type = instance_type;
    result.version_type = parallel ? "parallel" : "sequential";
    result.benchmark_name = "math";
    result.flops = problem_size * 8.0; // sin + cos + sqrt + pow + 3 additions + 1 multiply
    
    return result;
}

// Matrix Multiplication Benchmark - Memory intensive operations
BenchmarkResult runMatrixBenchmark(bool parallel, int matrix_size, const std::string& instance_type) {
    std::vector<std::vector<double>> A(matrix_size, std::vector<double>(matrix_size));
    std::vector<std::vector<double>> B(matrix_size, std::vector<double>(matrix_size));
    std::vector<std::vector<double>> C(matrix_size, std::vector<double>(matrix_size, 0.0));
    
    // Initialize matrices with simple values
    for (int i = 0; i < matrix_size; ++i) {
        for (int j = 0; j < matrix_size; ++j) {
            A[i][j] = (i + j) * 0.1;
            B[i][j] = (i - j + 1) * 0.1;
        }
    }
    
    auto start_time = std::chrono::high_resolution_clock::now();
    
    if (parallel) {
        #pragma omp parallel for collapse(2)
        for (int i = 0; i < matrix_size; ++i) {
            for (int j = 0; j < matrix_size; ++j) {
                for (int k = 0; k < matrix_size; ++k) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
    } else {
        for (int i = 0; i < matrix_size; ++i) {
            for (int j = 0; j < matrix_size; ++j) {
                for (int k = 0; k < matrix_size; ++k) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> duration = end_time - start_time;
    
    // Calculate checksum
    double sum_result = 0.0;
    for (int i = 0; i < matrix_size; ++i) {
        for (int j = 0; j < matrix_size; ++j) {
            sum_result += C[i][j];
        }
    }
    
    BenchmarkResult result;
    result.sum = static_cast<long long>(sum_result * 100); // Scale for integer representation
    result.execution_time = duration.count();
    result.thread_count = parallel ? omp_get_max_threads() : 1;
    result.problem_size = matrix_size * matrix_size; // Total elements
    result.instance_type = instance_type;
    result.version_type = parallel ? "parallel" : "sequential";
    result.benchmark_name = "matrix";
    result.flops = static_cast<double>(matrix_size) * matrix_size * matrix_size * 2.0; // N^3 * 2 (multiply + add)
    
    return result;
}

// Heavy Arithmetic Benchmark - Complex mathematical expressions
BenchmarkResult runHeavyArithmeticBenchmark(bool parallel, int problem_size, const std::string& instance_type) {
    std::vector<double> data(problem_size);
    double sum_result = 0.0;
    
    auto start_time = std::chrono::high_resolution_clock::now();
    
    if (parallel) {
        #pragma omp parallel for reduction(+:sum_result)
        for (int i = 0; i < problem_size; ++i) {
            double x = i + 1.0;
            // Complex arithmetic expression with multiple operations
            double result = (x * 3.14159) + std::sqrt(x) - std::pow(x, 0.3) + 
                           std::log(x) + std::exp(x * 0.0001) + std::sin(x * 0.01) * std::cos(x * 0.02);
            data[i] = result;
            sum_result += result;
        }
    } else {
        for (int i = 0; i < problem_size; ++i) {
            double x = i + 1.0;
            double result = (x * 3.14159) + std::sqrt(x) - std::pow(x, 0.3) + 
                           std::log(x) + std::exp(x * 0.0001) + std::sin(x * 0.01) * std::cos(x * 0.02);
            data[i] = result;
            sum_result += result;
        }
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> duration = end_time - start_time;
    
    BenchmarkResult result;
    result.sum = static_cast<long long>(sum_result * 1000); // Scale for integer representation
    result.execution_time = duration.count();
    result.thread_count = parallel ? omp_get_max_threads() : 1;
    result.problem_size = problem_size;
    result.instance_type = instance_type;
    result.version_type = parallel ? "parallel" : "sequential";
    result.benchmark_name = "heavy";
    result.flops = problem_size * 12.0; // Multiple math operations per element
    
    return result;
}

int main(int argc, char* argv[]) {
    // Parse command line arguments
    int problem_size = 600000000; // Default 600M for seconds-level runtime (4GB memory limit)
    int matrix_size = 1800; // Default matrix size for seconds-level target
    int max_threads = 0; // 0 means use all available (auto-detect)
    bool json_output = false;
    BenchmarkType benchmark_type = BenchmarkType::SIMPLE;
    
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--size" && i + 1 < argc) {
            problem_size = std::atoi(argv[++i]);
        } else if (arg == "--matrix-size" && i + 1 < argc) {
            matrix_size = std::atoi(argv[++i]);
        } else if (arg == "--threads" && i + 1 < argc) {
            max_threads = std::atoi(argv[++i]);
        } else if (arg == "--benchmark-type" && i + 1 < argc) {
            std::string type = argv[++i];
            if (type == "simple") benchmark_type = BenchmarkType::SIMPLE;
            else if (type == "math") benchmark_type = BenchmarkType::MATH;
            else if (type == "matrix") benchmark_type = BenchmarkType::MATRIX;
            else if (type == "heavy") benchmark_type = BenchmarkType::HEAVY;
            else if (type == "all") benchmark_type = BenchmarkType::ALL;
            else {
                std::cerr << "Invalid benchmark type: " << type << "\n";
                return 1;
            }
        } else if (arg == "--json") {
            json_output = true;
        } else if (arg == "--help") {
            std::cout << "Usage: " << argv[0] << " [options]\n";
            std::cout << "Options:\n";
            std::cout << "  --size N                Problem size (default: 750000000)\n";
            std::cout << "  --matrix-size N         Matrix size for matrix benchmark (default: 1200)\n";
            std::cout << "  --threads N             Max threads to use (default: auto-detect all)\n";
            std::cout << "  --benchmark-type TYPE   Benchmark type: simple|math|matrix|heavy|all (default: simple)\n";
            std::cout << "  --json                  Output results in JSON format\n";
            std::cout << "  --help                  Show this help message\n";
            std::cout << "\nBenchmark Types:\n";
            std::cout << "  simple    - Basic arithmetic operations (fastest)\n";
            std::cout << "  math      - Mathematical functions (sin, cos, sqrt, pow)\n";
            std::cout << "  matrix    - Matrix multiplication (memory intensive)\n";
            std::cout << "  heavy     - Complex arithmetic expressions\n";
            std::cout << "  all       - Run all benchmarks sequentially (~few seconds)\n";
            return 0;
        }
    }
    
    // Auto-detect thread count if not specified
    if (max_threads == 0) {
        max_threads = omp_get_max_threads();
    }
    
    // Set thread count
    omp_set_num_threads(max_threads);
    
    // Get instance type from environment (set by AWS Batch) or detect local system
    std::string instance_type = "local";
    const char* instance_env = std::getenv("AWS_BATCH_JOB_INSTANCE_TYPE");
    if (instance_env) {
        instance_type = instance_env;
    } else {
        const char* hostname_env = std::getenv("HOSTNAME");
        if (hostname_env) {
            std::string hostname = hostname_env;
            if (hostname.find(".compute.internal") != std::string::npos) {
                instance_type = "aws-development";
            } else {
                instance_type = "local-" + hostname;
            }
        } else {
            instance_type = "local-development";
        }
    }
    
    if (!json_output) {
        std::cout << "C++20 OpenMP Enhanced Benchmark Suite\n";
        std::cout << "====================================\n";
        
        // --- Demonstrate C++20 feature: std::string::starts_with ---
        std::string greeting = "Hello, C++20!";
        if (greeting.starts_with("Hello")) {
            std::cout << "✓ C++20 string::starts_with works!\n";
        }
        
        std::cout << "Auto-detected " << max_threads << " CPU cores for optimal threading\n";
        std::cout << "Instance type: " << instance_type << "\n\n";
    }
    
    // Calibrated problem sizes for seconds-level "all" benchmark target
    int simple_size = problem_size;  // Use provided size or default 4.5B
    int math_size = 100000000;       // 100M elements for math functions (4GB memory)
    int heavy_size = 50000000;       // 50M elements for heavy arithmetic (4GB memory)
    
    // Run benchmarks based on type
    if (benchmark_type == BenchmarkType::ALL) {
        // Run all benchmarks for comprehensive comparison (seconds-level total)
        std::vector<BenchmarkResult> seq_results, par_results;
        
        auto total_start = std::chrono::high_resolution_clock::now();
        
        if (!json_output) {
            std::cout << "Running comprehensive benchmark suite (estimated few seconds)...\n";
            std::cout << "===========================================================\n\n";
        }
        
        // 1. Simple Benchmark (1-1.5 minutes)
        if (!json_output) std::cout << "[1/4] Running Simple Benchmark (" << simple_size << " elements)...\n";
        seq_results.push_back(runSimpleBenchmark(false, simple_size, instance_type));
        par_results.push_back(runSimpleBenchmark(true, simple_size, instance_type));
        
        // 2. Math Functions Benchmark (1.5-2 minutes)
        if (!json_output) std::cout << "[2/4] Running Math Functions Benchmark (" << math_size << " elements)...\n";
        seq_results.push_back(runMathBenchmark(false, math_size, instance_type));
        par_results.push_back(runMathBenchmark(true, math_size, instance_type));
        
        // 3. Matrix Multiplication Benchmark (2-2.5 minutes)
        if (!json_output) std::cout << "[3/4] Running Matrix Multiplication Benchmark (" << matrix_size << "x" << matrix_size << ")...\n";
        seq_results.push_back(runMatrixBenchmark(false, matrix_size, instance_type));
        par_results.push_back(runMatrixBenchmark(true, matrix_size, instance_type));
        
        // 4. Heavy Arithmetic Benchmark (1-1.5 minutes)
        if (!json_output) std::cout << "[4/4] Running Heavy Arithmetic Benchmark (" << heavy_size << " elements)...\n";
        seq_results.push_back(runHeavyArithmeticBenchmark(false, heavy_size, instance_type));
        par_results.push_back(runHeavyArithmeticBenchmark(true, heavy_size, instance_type));
        
        auto total_end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> total_duration = total_end - total_start;
        
        // Output comprehensive JSON results
        if (json_output) {
            auto now = std::chrono::system_clock::now();
            auto time_t = std::chrono::system_clock::to_time_t(now);
            
            std::cout << "{\n";
            std::cout << "  \"benchmark_suite\": \"comprehensive_openmp_comparison\",\n";
            std::cout << "  \"total_runtime_seconds\": " << std::fixed << std::setprecision(2) << total_duration.count() << ",\n";
            std::cout << "  \"benchmarks\": {\n";
            
            for (size_t i = 0; i < par_results.size(); ++i) {
                const auto& seq = seq_results[i];
                const auto& par = par_results[i];
                double speedup = seq.execution_time / par.execution_time;
                
                std::cout << "    \"" << par.benchmark_name << "\": {\n";
                std::cout << "      \"sequential_time\": " << std::fixed << std::setprecision(3) << seq.execution_time << ",\n";
                std::cout << "      \"parallel_time\": " << std::fixed << std::setprecision(3) << par.execution_time << ",\n";
                std::cout << "      \"speedup\": " << std::fixed << std::setprecision(2) << speedup << ",\n";
                std::cout << "      \"efficiency_percent\": " << std::fixed << std::setprecision(1) << (speedup / par.thread_count * 100.0) << ",\n";
                std::cout << "      \"problem_size\": " << par.problem_size << ",\n";
                std::cout << "      \"gflops\": " << std::fixed << std::setprecision(2) << (par.flops / par.execution_time / 1000000000.0) << "\n";
                std::cout << "    }" << (i < par_results.size() - 1 ? "," : "") << "\n";
            }
            
            std::cout << "  },\n";
            std::cout << "  \"hardware_info\": {\n";
            std::cout << "    \"detected_cores\": " << max_threads << ",\n";
            std::cout << "    \"threads_used\": " << max_threads << ",\n";
            std::cout << "    \"instance_type\": \"" << instance_type << "\"\n";
            std::cout << "  },\n";
            std::cout << "  \"performance_unit\": \"gflops\",\n";
            std::cout << "  \"timestamp\": \"" << std::put_time(std::gmtime(&time_t), "%Y-%m-%dT%H:%M:%SZ") << "\",\n";
#ifdef _OPENMP
            std::cout << "  \"openmp_version\": \"" << _OPENMP << "\",\n";
#else
            std::cout << "  \"openmp_version\": \"not_available\",\n";
#endif
            std::cout << "  \"cpp_standard\": \"C++20\"\n";
            std::cout << "}\n";
        } else {
            // Detailed console output
            std::cout << "\n" << std::string(70, '=') << "\n";
            std::cout << "           COMPREHENSIVE BENCHMARK RESULTS\n";
            std::cout << std::string(70, '=') << "\n";
            std::cout << "Total execution time: " << std::fixed << std::setprecision(1) << total_duration.count() << " seconds (" << (total_duration.count()/60.0) << " minutes)\n\n";
            
            for (size_t i = 0; i < par_results.size(); ++i) {
                const auto& seq = seq_results[i];
                const auto& par = par_results[i];
                double speedup = seq.execution_time / par.execution_time;
                double efficiency = speedup / par.thread_count * 100.0;
                
                std::cout << "--- " << par.benchmark_name << " Benchmark ---\n";
                std::cout << "Sequential: " << std::fixed << std::setprecision(2) << seq.execution_time << "s, ";
                std::cout << "Parallel: " << std::fixed << std::setprecision(2) << par.execution_time << "s\n";
                std::cout << "Speedup: " << std::fixed << std::setprecision(2) << speedup << "x, ";
                std::cout << "Efficiency: " << std::fixed << std::setprecision(1) << efficiency << "%\n";
                std::cout << "GFLOPS: " << std::fixed << std::setprecision(2) << (par.flops / par.execution_time / 1000000000.0) << "\n\n";
            }
            
            std::cout << "Instance: " << instance_type << ", Threads: " << max_threads << "\n";
            std::cout << std::string(70, '=') << "\n";
        }
    } else {
        // Run individual benchmark type
        BenchmarkResult seq_result, par_result;
        
        switch (benchmark_type) {
            case BenchmarkType::SIMPLE:
                if (!json_output) std::cout << "Running Simple Benchmark...\n";
                seq_result = runSimpleBenchmark(false, simple_size, instance_type);
                par_result = runSimpleBenchmark(true, simple_size, instance_type);
                break;
            case BenchmarkType::MATH:
                if (!json_output) std::cout << "Running Math Functions Benchmark...\n";
                seq_result = runMathBenchmark(false, math_size, instance_type);
                par_result = runMathBenchmark(true, math_size, instance_type);
                break;
            case BenchmarkType::MATRIX:
                if (!json_output) std::cout << "Running Matrix Multiplication Benchmark...\n";
                seq_result = runMatrixBenchmark(false, matrix_size, instance_type);
                par_result = runMatrixBenchmark(true, matrix_size, instance_type);
                break;
            case BenchmarkType::HEAVY:
                if (!json_output) std::cout << "Running Heavy Arithmetic Benchmark...\n";
                seq_result = runHeavyArithmeticBenchmark(false, heavy_size, instance_type);
                par_result = runHeavyArithmeticBenchmark(true, heavy_size, instance_type);
                break;
            default:
                break;
        }
        
        // Calculate comparison metrics
        ComparisonResult comparison;
        comparison.sequential = seq_result;
        comparison.parallel = par_result;
        comparison.speedup = seq_result.execution_time / par_result.execution_time;
        comparison.efficiency = (comparison.speedup / par_result.thread_count) * 100.0;
        
        if (json_output) {
            printJsonComparison(comparison);
        } else {
            std::cout << "\n======================================\n";
            std::cout << "         PERFORMANCE COMPARISON       \n";
            std::cout << "======================================\n";
            
            std::cout << "\n--- Sequential Results ---\n";
            std::cout << "Execution time: " << std::fixed << std::setprecision(6) << seq_result.execution_time << " seconds\n";
            std::cout << "Problem size: " << seq_result.problem_size << " elements\n";
            std::cout << "GFLOPS: " << std::fixed << std::setprecision(2) << (seq_result.flops / seq_result.execution_time / 1000000000.0) << "\n";
            
            std::cout << "\n--- Parallel Results ---\n";
            std::cout << "Execution time: " << std::fixed << std::setprecision(6) << par_result.execution_time << " seconds\n";
            std::cout << "Problem size: " << par_result.problem_size << " elements\n";
            std::cout << "Threads used: " << par_result.thread_count << "\n";
            std::cout << "GFLOPS: " << std::fixed << std::setprecision(2) << (par_result.flops / par_result.execution_time / 1000000000.0) << "\n";
            
            std::cout << "\n--- Comparison Metrics ---\n";
            std::cout << "Speedup: " << std::fixed << std::setprecision(2) << comparison.speedup << "x\n";
            std::cout << "Efficiency: " << std::fixed << std::setprecision(2) << comparison.efficiency << "%\n";
            
            std::cout << "\n--- Performance Analysis ---\n";
            if (comparison.speedup > 1.0) {
                std::cout << "✓ Parallel version is " << std::fixed << std::setprecision(2) << comparison.speedup << "x faster\n";
            } else {
                std::cout << "✗ Parallel version is slower (overhead dominates)\n";
            }
            
            if (comparison.efficiency > 70.0) {
                std::cout << "✓ Excellent parallel efficiency (" << std::fixed << std::setprecision(1) << comparison.efficiency << "%)\n";
            } else if (comparison.efficiency > 50.0) {
                std::cout << "~ Good parallel efficiency (" << std::fixed << std::setprecision(1) << comparison.efficiency << "%)\n";
            } else {
                std::cout << "! Poor parallel efficiency (" << std::fixed << std::setprecision(1) << comparison.efficiency << "%)\n";
            }
            
            std::cout << "\nInstance: " << instance_type << ", Threads: " << max_threads << "\n";
            std::cout << "======================================\n";
        }
    }

    return 0;
}
