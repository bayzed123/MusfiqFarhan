/**
 * The private letter form.
 *
 * Deliberately one-way: this file sends and never fetches. There is no list
 * to render here and no endpoint that would return one — the whole promise of
 * the page is that what you write does not come back out anywhere public.
 *
 * The form is checked here before the request goes out, so a mistyped address
 * is caught at the keyboard rather than after a round trip. The Worker checks
 * everything again, because a browser check protects the person filling the
 * form in and nothing else.
 */

import { api } from './api.js';
import { $, on } from './dom.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s\-().]{6,}$/;

function say(status, message, state = '') {
  status.dataset.state = state;
  status.textContent = message;
}

/** The first thing wrong with the form, or '' when it is ready to send. */
function firstProblem({ name, email, whatsapp, zila, message }) {
  if (!name) return 'Please add your name.';
  if (!email) return 'Please add your email address.';
  if (!EMAIL.test(email)) return 'That email address does not look right.';
  if (whatsapp && !PHONE.test(whatsapp)) return 'That WhatsApp number does not look right.';
  if (!zila) return 'Please choose your district.';
  if (!message) return 'Please write your message.';
  if (message.length < 10) return 'Your message is a little too short.';
  return '';
}

export function initChithiForm() {
  const form = $('[data-chithi-form]');
  if (!form) return;

  const status = $('[data-chithi-status]', form);
  const counter = $('[data-chithi-count]', form);
  const messageBox = form.elements.message;

  if (counter && messageBox) {
    const count = () => {
      counter.textContent = String(messageBox.value.length);
    };
    on(messageBox, 'input', count);
    count();
  }

  on(form, 'submit', async (event) => {
    event.preventDefault();

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      whatsapp: form.elements.whatsapp.value.trim(),
      zila: form.elements.zila.value.trim(),
      upazila: form.elements.upazila.value.trim(),
      message: form.elements.message.value.trim(),
      website: form.elements.website.value
    };

    const problem = firstProblem(payload);
    if (problem) return say(status, problem, 'error');

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    say(status, 'Sending your letter…');

    try {
      const result = await api.submitChithi(payload);
      say(
        status,
        result.message || 'Your letter has been sent. It goes straight to Musfiq and no one else.',
        'success'
      );
      form.reset();
      if (counter) counter.textContent = '0';
    } catch (error) {
      say(status, error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      button.disabled = false;
    }
  });
}

initChithiForm();
