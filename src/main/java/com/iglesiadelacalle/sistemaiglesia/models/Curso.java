package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.util.List;
import java.util.ArrayList;
import java.time.LocalDate;
import java.time.ZoneId;

@Entity
@Table(name = "curso")
public class Curso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idCurso;

    @Column(name = "anio", nullable = false)
    private Integer anio; 

    @Column(name = "fecha_inscripcion", nullable = false, updatable = false)
    private LocalDate fechaInscripcion;

    // ⚡ FECHAS DE LA CLASE
    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    @ManyToOne
    @JoinColumn(name = "id_bloque", nullable = false)
    private Bloque bloque;

    @ManyToOne
    @JoinColumn(name = "id_instructor", nullable = false)
    private Persona instructor;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "curso_estudiante",
        joinColumns = @JoinColumn(name = "id_curso"),
        inverseJoinColumns = @JoinColumn(name = "id_estudiante")
    )
    private List<Persona> estudiantes;
    
    // ⚡ FECHAS DE LOS TIPS ASIGNADOS A ESTA CLASE
    @OneToMany(mappedBy = "curso", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CronogramaTip> fechasTips = new ArrayList<>();

    @Column(length = 20)
    private String estado = "Activo"; 

    @PrePersist
    protected void onCreate() {
        this.fechaInscripcion = LocalDate.now(ZoneId.of("America/Caracas"));
    }

    // --- GETTERS Y SETTERS ---

    public Integer getIdCurso() { return idCurso; }
    public void setIdCurso(Integer idCurso) { this.idCurso = idCurso; }

    public Integer getAnio() { return anio; }
    public void setAnio(Integer anio) { this.anio = anio; }

    public LocalDate getFechaInscripcion() { return fechaInscripcion; }
    public void setFechaInscripcion(LocalDate fechaInscripcion) { this.fechaInscripcion = fechaInscripcion; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public Bloque getBloque() { return bloque; }
    public void setBloque(Bloque bloque) { this.bloque = bloque; }

    public Persona getInstructor() { return instructor; }
    public void setInstructor(Persona instructor) { this.instructor = instructor; }

    public List<Persona> getEstudiantes() { return estudiantes; }
    public void setEstudiantes(List<Persona> estudiantes) { this.estudiantes = estudiantes; }

    public List<CronogramaTip> getFechasTips() { return fechasTips; }
    public void setFechasTips(List<CronogramaTip> fechasTips) { this.fechasTips = fechasTips; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}