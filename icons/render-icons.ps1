$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = $PSScriptRoot
$master = [System.Drawing.Bitmap]::new(1024,1024)
$graphics = [System.Drawing.Graphics]::FromImage($master)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.ScaleTransform(8,8)
$path = [System.Drawing.Drawing2D.GraphicsPath]::new()
$path.AddArc(4,4,56,56,180,90)
$path.AddArc(68,4,56,56,270,90)
$path.AddArc(68,68,56,56,0,90)
$path.AddArc(4,68,56,56,90,90)
$path.CloseFigure()
$background = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.Point]::new(4,4),[System.Drawing.Point]::new(124,124),[System.Drawing.ColorTranslator]::FromHtml('#124b9a'),[System.Drawing.ColorTranslator]::FromHtml('#1878d3'))
$graphics.FillPath($background,$path)
$pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White,9)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$graphics.DrawArc($pen,28,28,72,72,-90,270)
$points = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(47,64),[System.Drawing.PointF]::new(59,76),[System.Drawing.PointF]::new(81,52))
$graphics.DrawLines($pen,$points)
$dot = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#65e0c1'))
$graphics.FillEllipse($dot,58,22,12,12)
foreach($size in @(16,24,32,48,128,256)) {
  $bitmap = [System.Drawing.Bitmap]::new($size,$size)
  $canvas = [System.Drawing.Graphics]::FromImage($bitmap)
  $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $canvas.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $canvas.DrawImage($master,[System.Drawing.Rectangle]::new(0,0,$size,$size))
  $bitmap.Save((Join-Path $iconDirectory "icon-$size.png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Dispose()
  $bitmap.Dispose()
}
$dot.Dispose()
$pen.Dispose()
$background.Dispose()
$path.Dispose()
$graphics.Dispose()
$master.Dispose()
Write-Output 'Rendered PNG icons: 16, 24, 32, 48, 128, 256 px.'
