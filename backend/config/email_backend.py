from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend
import io

class NoWrapConsoleEmailBackend(ConsoleEmailBackend):
    def write_message(self, message):
        # Get the raw message content
        msg_data = message.message().as_string()
        # Remove the "=\n" soft line breaks that quoted-printable adds
        msg_data = msg_data.replace('=\n', '')
        self.stream.write('%s\n' % msg_data)
        self.stream.write('-' * 79)
        self.stream.write('\n')