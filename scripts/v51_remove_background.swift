import AppKit
import CoreImage
import Foundation
import Vision

guard CommandLine.arguments.count == 3 else {
    fputs("usage: v51_remove_background.swift INPUT OUTPUT.png\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let inputImage = CIImage(contentsOf: inputURL) else {
    fputs("cannot read input image\n", stderr)
    exit(2)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: inputImage, options: [:])
try handler.perform([request])
guard let observation = request.results?.first else {
    fputs("Vision found no foreground instances\n", stderr)
    exit(1)
}

let maskBuffer = try observation.generateScaledMaskForImage(
    forInstances: observation.allInstances,
    from: handler
)
let mask = CIImage(cvPixelBuffer: maskBuffer)
let transparent = CIImage(color: CIColor.clear).cropped(to: inputImage.extent)
let composited = inputImage.applyingFilter(
    "CIBlendWithMask",
    parameters: [
        kCIInputBackgroundImageKey: transparent,
        kCIInputMaskImageKey: mask,
    ]
)
let context = CIContext(options: [.useSoftwareRenderer: false])
try context.writePNGRepresentation(
    of: composited,
    to: outputURL,
    format: .RGBA8,
    colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!
)
