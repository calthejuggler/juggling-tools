//! Benchmark binary for measuring graph and table computation performance.

#![allow(
    missing_docs,
    clippy::expect_used,
    clippy::print_stdout,
    clippy::print_stderr,
    clippy::missing_assert_message
)]

use std::hint::black_box;
use std::process::ExitCode;

use juggling_tools::state_notation::{Params, compute_graph, compute_table};

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();

    let num_props: u8 = args
        .get(1)
        .expect("usage: bench <num_props> <max_height> [iterations]")
        .parse()
        .expect("num_props must be a u8");
    let max_height: u8 = args
        .get(2)
        .expect("usage: bench <num_props> <max_height> [iterations]")
        .parse()
        .expect("max_height must be a u8");
    let iterations: u32 = args
        .get(3)
        .map_or(1, |s| s.parse().expect("iterations must be a u32"));

    let params = Params {
        num_props,
        max_height,
    };

    for _ in 0..iterations {
        if let Err(e) = compute_graph(&params).map(black_box) {
            eprintln!("compute_graph failed: {e}");
            return ExitCode::FAILURE;
        }
        if let Err(e) = compute_table(&params).map(black_box) {
            eprintln!("compute_table failed: {e}");
            return ExitCode::FAILURE;
        }
    }

    ExitCode::SUCCESS
}
