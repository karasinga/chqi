from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend
import re
import sys


class NoWrapConsoleEmailBackend(ConsoleEmailBackend):
    """
    Development email backend that prints a loud, easy-to-spot banner
    with the password reset link extracted from the email body.
    """

    def write_message(self, message):
        msg_data = message.message().as_string()
        # Remove quoted-printable soft line breaks
        msg_data = msg_data.replace('=\n', '').replace('=3D', '=')

        # Try to extract the reset link for a clean summary banner
        link_match = re.search(r'(https?://[^\s]+reset-password[^\s]+)', msg_data)
        reset_link = link_match.group(1) if link_match else None

        sep = '=' * 72
        self.stream.write(f'\n{sep}\n')
        self.stream.write('  📧  PASSWORD RESET EMAIL (DEV MODE)\n')
        self.stream.write(f'{sep}\n')

        if reset_link:
            self.stream.write(f'  ✅  RESET LINK:\n\n  {reset_link}\n\n')
        else:
            # Fallback: print the full body so nothing is lost
            self.stream.write(msg_data)

        self.stream.write(f'{sep}\n\n')
        self.stream.flush()
