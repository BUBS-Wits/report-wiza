/* global jest, describe, test, expect */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import TransparentBtn from '../components/buttons/transparent_btn.js';

// Mock the CSS file
jest.mock('../components/buttons/button.css', () => ({}));

describe('TransparentBtn Component', () => {
    test('renders with provided text and default classes', () => {
        render(<TransparentBtn text="Cancel" />);
        
        const button = screen.getByRole('button', { name: 'Cancel' });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('btn_components', 'transparent_button');
        expect(button).not.toHaveClass('loading');
    });

    test('calls the onClick handler when clicked', () => {
        const mockOnClick = jest.fn();
        render(<TransparentBtn text="Cancel" onClick={mockOnClick} />);
        
        const button = screen.getByRole('button', { name: 'Cancel' });
        fireEvent.click(button);
        
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('appends the loading class when text is "Loading"', () => {
        render(<TransparentBtn text="Loading" />);
        
        const button = screen.getByRole('button', { name: 'Loading' });
        expect(button).toHaveClass('btn_components', 'transparent_button', 'loading');
    });
});