CXX = g++
CXXFLAGS = -std=c++20 -O3 -fopenmp -Wall -Wextra
TARGET = openmp_benchmark
TEST_TARGET = test_benchmark
SOURCE = main.cpp
TEST_SOURCE = test_benchmark.cpp

# Default target
all: $(TARGET)

# Build the executable
$(TARGET): $(SOURCE)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SOURCE)

# Build the unit test executable
$(TEST_TARGET): $(TEST_SOURCE)
	$(CXX) $(CXXFLAGS) -o $(TEST_TARGET) $(TEST_SOURCE)

# Clean build artifacts
clean:
	rm -f $(TARGET) $(TEST_TARGET) *.o

# Run unit tests
unit-test: $(TEST_TARGET)
	@echo "Running unit tests..."
	./$(TEST_TARGET)

# Test with different configurations
integration-test: $(TARGET)
	@echo "Running integration tests..."
	@echo "Testing with default settings:"
	./$(TARGET)
	@echo "\nTesting with JSON output:"
	./$(TARGET) --json
	@echo "\nTesting with custom size and threads:"
	./$(TARGET) --size 50000000 --threads 4

# Run all tests
test: unit-test integration-test
	@echo "\nAll tests completed!"

# Install (for Docker)
install: $(TARGET)
	cp $(TARGET) /usr/local/bin/

.PHONY: all clean test unit-test integration-test install
