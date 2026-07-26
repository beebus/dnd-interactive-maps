import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ContactModal from './ContactModal';

function getCaptchaAnswer(): number {
  const label = screen.getByText(/What is \d+ \+ \d+\?/).textContent || '';
  const match = label.match(/What is (\d+) \+ (\d+)\?/);
  if (!match) throw new Error('Could not find captcha label');
  return parseInt(match[1], 10) + parseInt(match[2], 10);
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Drizzt' } });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'drizzt@menzo.com' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello there' } });
  fireEvent.change(screen.getByLabelText(/What is \d+ \+ \d+\?/), {
    target: { value: String(getCaptchaAnswer()) },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

test('renders the form fields', () => {
  render(<ContactModal onClose={vi.fn()} />);
  expect(screen.getByLabelText('Name')).toBeInTheDocument();
  expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  expect(screen.getByLabelText('Message')).toBeInTheDocument();
  expect(screen.getByText(/What is \d+ \+ \d+\?/)).toBeInTheDocument();
});

test('submit button is disabled by default', () => {
  render(<ContactModal onClose={vi.fn()} />);
  expect(screen.getByText('Send')).toBeDisabled();
});

test('submit button stays disabled when the captcha is missing', () => {
  render(<ContactModal onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Drizzt' } });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'drizzt@menzo.com' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello there' } });
  expect(screen.getByText('Send')).toBeDisabled();
});

test('submit button stays disabled when the captcha answer is wrong', () => {
  render(<ContactModal onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Drizzt' } });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'drizzt@menzo.com' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello there' } });
  fireEvent.change(screen.getByLabelText(/What is \d+ \+ \d+\?/), { target: { value: String(getCaptchaAnswer() + 1) } });
  expect(screen.getByText('Send')).toBeDisabled();
});

test('shows a validation message for an invalid email', () => {
  render(<ContactModal onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'not-an-email' } });
  expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
});

test('does not show an email validation message while the field is empty', () => {
  render(<ContactModal onClose={vi.fn()} />);
  expect(screen.queryByText('Please enter a valid email address.')).not.toBeInTheDocument();
});

test('submit button is enabled once all fields are valid', () => {
  render(<ContactModal onClose={vi.fn()} />);
  fillValidForm();
  expect(screen.getByText('Send')).not.toBeDisabled();
});

test('calls onClose when the close button is clicked', () => {
  const onClose = vi.fn();
  render(<ContactModal onClose={onClose} />);
  fireEvent.click(screen.getByLabelText('Close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('calls onClose when the overlay is clicked', () => {
  const onClose = vi.fn();
  const { container } = render(<ContactModal onClose={onClose} />);
  fireEvent.click(container.querySelector('.modal-overlay')!);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('does not call onClose when the card itself is clicked', () => {
  const onClose = vi.fn();
  const { container } = render(<ContactModal onClose={onClose} />);
  fireEvent.click(container.querySelector('.modal-card')!);
  expect(onClose).not.toHaveBeenCalled();
});

test('submits the form and shows a success message on a successful response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  render(<ContactModal onClose={vi.fn()} />);
  fillValidForm();
  fireEvent.click(screen.getByText('Send'));

  await waitFor(() => {
    expect(screen.getByText('Your message has been sent! Thank you for the feedback.')).toBeInTheDocument();
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [, requestInit] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
  expect(requestInit.method).toBe('POST');
  expect(JSON.parse(requestInit.body)).toEqual({
    name: 'Drizzt',
    email: 'drizzt@menzo.com',
    message: 'Hello there',
  });
});

test('shows the sending state while the request is in flight', async () => {
  let resolveFetch: (value: unknown) => void;
  const pending = new Promise(resolve => { resolveFetch = resolve; });
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));
  render(<ContactModal onClose={vi.fn()} />);
  fillValidForm();
  fireEvent.click(screen.getByText('Send'));

  expect(screen.getByText('Sending…')).toBeInTheDocument();
  expect(screen.getByText('Sending…')).toBeDisabled();

  resolveFetch!({ ok: true, json: async () => ({}) });
  await waitFor(() => expect(screen.getByText(/message has been sent/)).toBeInTheDocument());
});

test('shows the server-provided error message on a failed response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Duplicate submission' }) }));
  render(<ContactModal onClose={vi.fn()} />);
  fillValidForm();
  fireEvent.click(screen.getByText('Send'));

  await waitFor(() => {
    expect(screen.getByText('Duplicate submission')).toBeInTheDocument();
  });
});

test('shows a generic error message on a failed response with no error body', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error('bad json'); } }));
  render(<ContactModal onClose={vi.fn()} />);
  fillValidForm();
  fireEvent.click(screen.getByText('Send'));

  await waitFor(() => {
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});

test('shows a network error message when the fetch rejects', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<ContactModal onClose={vi.fn()} />);
  fillValidForm();
  fireEvent.click(screen.getByText('Send'));

  await waitFor(() => {
    expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
  });
});

test('clears the error message once the user edits a field again', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<ContactModal onClose={vi.fn()} />);
  fillValidForm();
  fireEvent.click(screen.getByText('Send'));

  await waitFor(() => {
    expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Drizzt Do\'Urden' } });
  expect(screen.queryByText('Network error. Please check your connection and try again.')).not.toBeInTheDocument();
});

test('does not submit when required fields are missing', () => {
  vi.stubGlobal('fetch', vi.fn());
  const { container } = render(<ContactModal onClose={vi.fn()} />);
  fireEvent.submit(container.querySelector('form')!);
  expect(fetch).not.toHaveBeenCalled();
});
