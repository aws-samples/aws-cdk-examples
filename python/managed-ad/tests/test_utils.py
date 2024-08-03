import unittest
from password_rotator_lambda.utils import generate_random_password


class TestUtils(unittest.TestCase):

    def test_generate_random_password_length_8(self):
        password = generate_random_password(8)
        self.assertEqual(len(password), 8)

    def test_generate_random_password_length_16(self):
        password = generate_random_password(16)
        self.assertEqual(len(password), 16)

    def test_generate_random_password_length_32(self):
        password = generate_random_password(32)
        self.assertEqual(len(password), 32)

    def test_generate_random_password_default_length(self):
        password = generate_random_password()
        # Update the following assertion if the default length has changed
        self.assertEqual(len(password), 32)


if __name__ == "__main__":
    unittest.main()
